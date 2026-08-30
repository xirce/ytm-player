import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import express, { NextFunction, Request, Response } from 'express';

try {
    const loadEnvFile = (process as typeof process & { loadEnvFile?: (path?: string) => void }).loadEnvFile;
    loadEnvFile?.(path.resolve(__dirname, '..', '..', '.env'));
} catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

type JsonObject = Record<string, unknown>;
type RpcResponse = { id: number; result?: unknown; error?: unknown };
type RpcMessage = { id?: number; method?: string; params?: JsonObject; result?: unknown; error?: unknown };
type CodexThread = {
    id: string;
    cwd: string;
    name?: string | null;
    title?: string | null;
    preview?: string | null;
    path?: string | null;
    createdAt?: number;
    updatedAt?: number;
};

const workspace = path.resolve(__dirname, '..', '..');
const publicDir = path.resolve(__dirname, 'public');
const cacheDir = path.join(workspace, '.cache');
const tokenFile = path.join(cacheDir, 'remote-codex-token');
const host = process.env.REMOTE_CODEX_HOST?.trim() || '0.0.0.0';
const port = Number(process.env.REMOTE_CODEX_PORT || 3210);
const normalizePath = (value: string): string => {
    const resolved = path.resolve(value).replace(/[\\/]+$/, '');
    return process.platform === 'win32' ? resolved.toLocaleLowerCase('en-US') : resolved;
};

const findCodexExecutable = (): string => {
    const configured = process.env.REMOTE_CODEX_EXECUTABLE?.trim();
    if (configured) return configured;
    if (process.platform === 'win32') {
        const extensionRoots = [
            path.join(process.env.USERPROFILE || '', '.vscode', 'extensions'),
            path.join(process.env.USERPROFILE || '', '.vscode-insiders', 'extensions')
        ];
        const candidates = extensionRoots.flatMap(root => {
            if (!existsSync(root)) return [];
            return readdirSync(root, { withFileTypes: true })
                .filter(entry => entry.isDirectory() && entry.name.startsWith('openai.chatgpt-'))
                .map(entry => path.join(root, entry.name, 'bin', 'windows-x86_64', 'codex.exe'))
                .filter(existsSync);
        });
        candidates.sort((left, right) => right.localeCompare(left, 'en', { numeric: true }));
        if (candidates[0]) return candidates[0];
        return 'codex.cmd';
    }
    return 'codex';
};

const loadAccessToken = (): { token: string; generated: boolean } => {
    const configured = process.env.REMOTE_CODEX_TOKEN?.trim();
    if (configured) return { token: configured, generated: false };
    if (existsSync(tokenFile)) return { token: readFileSync(tokenFile, 'utf8').trim(), generated: false };
    mkdirSync(cacheDir, { recursive: true });
    const token = randomBytes(24).toString('base64url');
    writeFileSync(tokenFile, token, { encoding: 'utf8', mode: 0o600 });
    return { token, generated: true };
};

const access = loadAccessToken();
const browserSessionToken = createHmac('sha256', access.token)
    .update('remote-codex-browser-session-v1')
    .digest('base64url');
const clients = new Set<Response>();
const eventLog: Array<{ id: number; type: string; payload: unknown }> = [];
const eventEpoch = randomBytes(8).toString('hex');
let eventId = 0;

const emit = (type: string, payload: unknown) => {
    const event = { id: ++eventId, type, payload };
    eventLog.push(event);
    if (eventLog.length > 300) eventLog.shift();
    const chunk = `id: ${eventEpoch}:${event.id}\nevent: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    clients.forEach(client => client.write(chunk));
};

const emitLive = (type: string, payload: unknown) => {
    const chunk = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    clients.forEach(client => client.write(chunk));
};

const safeEqual = (left: string, right: string): boolean => {
    const leftHash = createHash('sha256').update(left).digest();
    const rightHash = createHash('sha256').update(right).digest();
    return timingSafeEqual(Uint8Array.from(leftHash), Uint8Array.from(rightHash));
};

const parseCookies = (request: Request): Record<string, string> => Object.fromEntries(
    (request.headers.cookie || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
        const separator = part.indexOf('=');
        return separator < 0
            ? [part, '']
            : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    })
);

const requireAuth = (request: Request, response: Response, next: NextFunction) => {
    const session = parseCookies(request).remote_codex_session;
    if (!session || !safeEqual(session, browserSessionToken)) {
        response.status(401).json({ error: 'Authentication required' });
        return;
    }
    next();
};

class CodexAppServer {
    private child?: ChildProcessWithoutNullStreams;
    private shuttingDown = false;
    private requestId = 0;
    private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
    private approvalRequests = new Map<number, RpcMessage>();
    public threadId: string | null = null;
    public turnId: string | null = null;
    public status: 'starting' | 'ready' | 'running' | 'waiting' | 'error' = 'starting';
    public diff = '';
    private threadPath: string | null = null;

    isBusy(): boolean {
        return this.status === 'running' || this.status === 'waiting';
    }

    async start(): Promise<void> {
        if (this.child) return;
        const executable = findCodexExecutable();
        this.child = spawn(executable, ['app-server', '--stdio'], {
            cwd: workspace,
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
            shell: executable.toLowerCase().endsWith('.cmd')
        }) as ChildProcessWithoutNullStreams;
        console.log(`Codex executable: ${executable}`);

        this.child.stderr.on('data', data => emit('log', { level: 'stderr', text: String(data) }));
        this.child.on('exit', code => {
            this.child = undefined;
            if (this.shuttingDown) return;
            this.status = 'error';
            emit('status', this.snapshot({ error: `Codex app-server exited with code ${code}` }));
            this.pending.forEach(entry => entry.reject(new Error('Codex app-server stopped')));
            this.pending.clear();
        });

        const lines = readline.createInterface({ input: this.child.stdout });
        lines.on('line', line => {
            try {
                this.handle(JSON.parse(line) as RpcMessage);
            } catch (error) {
                emit('log', { level: 'error', text: `Invalid app-server message: ${(error as Error).message}` });
            }
        });

        await this.request('initialize', {
            clientInfo: { name: 'remote-codex', title: 'Remote Codex', version: '0.1.0' },
            capabilities: { experimentalApi: true, requestAttestation: false }
        });
        this.notify('initialized');
        await this.restoreLatestThread();
        this.status = 'ready';
        emit('status', this.snapshot());
    }

    snapshot(extra: JsonObject = {}) {
        return { status: this.status, threadId: this.threadId, turnId: this.turnId, diff: this.diff, ...extra };
    }

    async newThread(): Promise<void> {
        if (this.status === 'running' || this.status === 'waiting') throw new Error('Stop the active turn first');
        const result = await this.request('thread/start', {
            cwd: workspace,
            runtimeWorkspaceRoots: [workspace],
            approvalPolicy: 'on-request',
            approvalsReviewer: 'auto_review',
            sandbox: 'workspace-write',
            ephemeral: false
        }) as { thread: { id: string; path?: string | null } };
        this.threadId = result.thread.id;
        this.threadPath = result.thread.path || null;
        this.turnId = null;
        this.diff = '';
        emitLive('reset', this.snapshot());
    }

    async send(text: string): Promise<void> {
        if (!text.trim()) throw new Error('Message is empty');
        if (this.status === 'running' || this.status === 'waiting') throw new Error('Codex is already working');
        if (!this.threadId) await this.newThread();
        emit('user', { text: text.trim(), timestamp: Date.now() });
        this.status = 'running';
        emit('status', this.snapshot());
        const result = await this.request('turn/start', {
            threadId: this.threadId,
            input: [{ type: 'text', text: text.trim(), text_elements: [] }],
            cwd: workspace,
            runtimeWorkspaceRoots: [workspace],
            approvalPolicy: 'on-request',
            approvalsReviewer: 'auto_review'
        }) as { turn: { id: string } };
        this.turnId = result.turn.id;
        emit('status', this.snapshot());
    }

    async interrupt(): Promise<void> {
        if (!this.threadId || !this.turnId) return;
        await this.request('turn/interrupt', { threadId: this.threadId, turnId: this.turnId });
    }

    async stop(): Promise<void> {
        this.shuttingDown = true;
        const child = this.child;
        if (!child) return;
        await new Promise<void>(resolve => {
            const timeout = setTimeout(() => {
                child.kill('SIGKILL');
                resolve();
            }, 2000);
            child.once('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
            child.kill('SIGTERM');
        });
    }

    async listThreads(): Promise<CodexThread[]> {
        const result = await this.request('thread/list', {
            limit: 50,
            sortKey: 'updated_at',
            sortDirection: 'desc',
            cwd: workspace
        }) as { data: CodexThread[] };
        return result.data.filter(thread => normalizePath(thread.cwd) === normalizePath(workspace));
    }

    async resumeThread(threadId: string, broadcastHistory = true): Promise<void> {
        if (this.status === 'running' || this.status === 'waiting') throw new Error('Stop the active turn first');
        const available = await this.listThreads();
        const selected = available.find(thread => thread.id === threadId);
        if (!selected) throw new Error('Thread does not belong to this workspace');
        const resumed = await this.request('thread/resume', {
            threadId,
            cwd: workspace,
            runtimeWorkspaceRoots: [workspace],
            approvalPolicy: 'on-request',
            approvalsReviewer: 'auto_review',
            sandbox: 'workspace-write'
        }) as { thread: { id: string; path?: string | null; turns?: unknown[] } };
        this.threadId = resumed.thread.id;
        this.threadPath = resumed.thread.path || selected.path || null;
        this.turnId = null;
        this.diff = '';
        const turns = await this.getRecentTurns();
        if (broadcastHistory) {
            emitLive('reset', this.snapshot());
            emitLive('history', { turns });
        }
    }

    async getRecentTurns(limit = 200): Promise<unknown[]> {
        if (!this.threadId) return [];
        const rolloutTurns = await this.readRolloutTurns(limit);
        if (rolloutTurns.length) return rolloutTurns;
        type HistoryTurn = { id: string; startedAt?: number | null; completedAt?: number | null };
        const turns = new Map<string, HistoryTurn>();
        let cursor: string | null = null;
        for (let page = 0; page < 20; page += 1) {
            const turnsPage = await this.request('thread/turns/list', {
                threadId: this.threadId,
                cursor,
                limit: 100,
                sortDirection: 'desc',
                itemsView: 'full'
            }) as { data: HistoryTurn[]; nextCursor: string | null };
            turnsPage.data.forEach(turn => turns.set(turn.id, turn));
            if (!turnsPage.nextCursor || turnsPage.nextCursor === cursor) break;
            cursor = turnsPage.nextCursor;
        }
        return [...turns.values()]
            .sort((left, right) => {
                const leftTime = left.startedAt || left.completedAt || 0;
                const rightTime = right.startedAt || right.completedAt || 0;
                return leftTime - rightTime || left.id.localeCompare(right.id);
            })
            .slice(-limit);
    }

    private async readRolloutTurns(limit: number): Promise<unknown[]> {
        if (!this.threadPath || !existsSync(this.threadPath)) return [];
        type HistoryItem = Record<string, unknown>;
        type HistoryTurn = {
            id: string;
            items: HistoryItem[];
            status: string;
            startedAt: number | null;
            completedAt: number | null;
            durationMs: number | null;
        };
        const turns = new Map<string, HistoryTurn>();
        const lines = readline.createInterface({ input: createReadStream(this.threadPath), crlfDelay: Infinity });
        for await (const line of lines) {
            let entry: { timestamp?: string; type?: string; payload?: Record<string, unknown> };
            try { entry = JSON.parse(line) as typeof entry; } catch { continue; }
            const payload = entry.payload || {};
            const metadata = payload.internal_chat_message_metadata_passthrough as Record<string, unknown> | undefined;
            const eventItem = payload.item as Record<string, unknown> | undefined;
            const turnId = typeof metadata?.turn_id === 'string'
                ? metadata.turn_id
                : typeof payload.turn_id === 'string' ? payload.turn_id : null;
            if (!turnId) continue;
            const timestamp = typeof metadata?.create_time === 'number'
                ? metadata.create_time
                : entry.timestamp ? Date.parse(entry.timestamp) / 1000 : Date.now() / 1000;
            let turn = turns.get(turnId);
            if (!turn) {
                turn = { id: turnId, items: [], status: 'completed', startedAt: timestamp, completedAt: timestamp, durationMs: null };
                turns.set(turnId, turn);
            } else {
                turn.startedAt = Math.min(turn.startedAt || timestamp, timestamp);
                turn.completedAt = Math.max(turn.completedAt || timestamp, timestamp);
            }
            if (entry.type === 'response_item' && payload.type === 'message') {
                const role = payload.role;
                const content = Array.isArray(payload.content) ? payload.content as Array<Record<string, unknown>> : [];
                const text = content.map(part => typeof part.text === 'string' ? part.text : '').join('');
                if (role === 'user') {
                    turn.items.push({ type: 'userMessage', id: payload.id, content: [{ type: 'text', text }] });
                } else if (role === 'assistant') {
                    turn.items.push({ type: 'agentMessage', id: payload.id, text, phase: payload.phase || null });
                }
            } else if (entry.type === 'event_msg' && payload.type === 'item_completed' && eventItem) {
                const itemType = String(eventItem.type || '').toLowerCase();
                if (itemType === 'commandexecution') {
                    turn.items.push({ type: 'commandExecution', id: eventItem.id, command: eventItem.command || '' });
                } else if (itemType === 'filechange') {
                    const rawChanges = eventItem.changes;
                    const changes = Array.isArray(rawChanges)
                        ? rawChanges
                        : rawChanges && typeof rawChanges === 'object'
                            ? Object.entries(rawChanges as Record<string, unknown>).map(([path, change]) => ({
                                path,
                                ...(change && typeof change === 'object'
                                    ? change as Record<string, unknown>
                                    : { diff: typeof change === 'string' ? change : '' })
                            }))
                            : [];
                    turn.items.push({ type: 'fileChange', id: eventItem.id, changes });
                }
            }
        }
        return [...turns.values()]
            .map(turn => ({
                ...turn,
                durationMs: turn.startedAt != null && turn.completedAt != null
                    ? Math.max(0, (turn.completedAt - turn.startedAt) * 1000)
                    : null
            }))
            .slice(-limit);
    }

    approve(requestId: number, decision: 'accept' | 'decline'): void {
        const approval = this.approvalRequests.get(requestId);
        if (!approval) throw new Error('Approval request is no longer active');
        const result = approval.method === 'item/commandExecution/requestApproval'
            ? { decision }
            : approval.method === 'item/fileChange/requestApproval'
                ? { decision }
                : null;
        if (!result) throw new Error('This approval type is not supported yet');
        this.write({ id: requestId, result });
        this.approvalRequests.delete(requestId);
        this.status = 'running';
        emit('approval-resolved', { requestId, decision });
        emit('status', this.snapshot());
    }

    private async restoreLatestThread(): Promise<void> {
        const latest = (await this.listThreads())[0];
        if (!latest) {
            await this.newThread();
            return;
        }
        try {
        await this.resumeThread(latest.id, false);
        } catch (error) {
            const message = (error as Error).message;
            if (!message.includes('already has an active writer')) throw error;
            this.threadId = null;
            emit('log', {
                level: 'warning',
                text: 'Последняя сессия открыта в IDE. Закройте её в IDE или выберите другую сессию; новый запрос создаст отдельный диалог.'
            });
        }
    }

    private handle(message: RpcMessage): void {
        if (typeof message.id === 'number' && !message.method) {
            const pending = this.pending.get(message.id);
            if (!pending) return;
            this.pending.delete(message.id);
            if (message.error) {
                const rpcError = message.error as { message?: unknown };
                pending.reject(new Error(typeof rpcError.message === 'string' ? rpcError.message : JSON.stringify(message.error)));
            }
            else pending.resolve(message.result);
            return;
        }

        if (typeof message.id === 'number' && message.method) {
            if (message.method === 'item/commandExecution/requestApproval'
                || message.method === 'item/fileChange/requestApproval') {
                this.approvalRequests.set(message.id, message);
                this.status = 'waiting';
                emit('approval', { requestId: message.id, method: message.method, params: message.params });
                emit('status', this.snapshot());
            } else {
                this.write({ id: message.id, error: { code: -32601, message: 'Unsupported remote request' } });
                emit('log', { level: 'warning', text: `Unsupported Codex request: ${message.method}` });
            }
            return;
        }

        if (!message.method) return;
        const params = message.params || {};
        if (message.method === 'item/agentMessage/delta') emit('assistant-delta', params);
        else if (message.method === 'item/started' || message.method === 'item/completed') emit('item', { method: message.method, ...params });
        else if (message.method === 'turn/diff/updated') {
            this.diff = typeof params.diff === 'string' ? params.diff : '';
            emit('diff', { diff: this.diff });
        } else if (message.method === 'turn/completed') {
            this.status = 'ready';
            this.turnId = null;
            emit('turn-completed', params);
            emit('status', this.snapshot());
            applyDeferredRestart();
        } else if (message.method === 'error') {
            emit('error', params);
        }
    }

    private request(method: string, params: JsonObject): Promise<unknown> {
        const id = ++this.requestId;
        this.write({ method, id, params });
        return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    }

    private notify(method: string): void {
        this.write({ method });
    }

    private write(message: RpcMessage | RpcResponse): void {
        if (!this.child) throw new Error('Codex app-server is not running');
        this.child.stdin.write(`${JSON.stringify(message)}\n`);
    }
}

const codex = new CodexAppServer();
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

app.post('/api/login', (request, response) => {
    const token = typeof request.body?.token === 'string' ? request.body.token : '';
    if (!safeEqual(token, access.token)) {
        response.status(401).json({ error: 'Неверный токен' });
        return;
    }
    response.setHeader(
        'Set-Cookie',
        `remote_codex_session=${browserSessionToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`
    );
    response.status(204).end();
});

app.get('/api/session', (request, response) => {
    const session = parseCookies(request).remote_codex_session;
    response.json({ authenticated: Boolean(session && safeEqual(session, browserSessionToken)) });
});

app.use('/api', requireAuth);
app.get('/api/state', (_request, response) => response.json(codex.snapshot()));
app.get('/api/history', async (_request, response, next) => {
    try { response.json({ turns: await codex.getRecentTurns() }); } catch (error) { next(error); }
});
app.get('/api/events', (request, response) => {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    clients.add(response);
    const [requestedEpoch, requestedId] = String(request.headers['last-event-id'] || '').split(':');
    const parsedId = Number(requestedId);
    // Event ids are process-local. A new epoch means EventSource reconnected after
    // a supervisor restart, so replay reset/history from the new process.
    const lastEventId = requestedEpoch === eventEpoch && Number.isFinite(parsedId) ? parsedId : 0;
    eventLog
        .filter(event => event.id > lastEventId)
        .forEach(event => response.write(`id: ${eventEpoch}:${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`));
    const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15000);
    request.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(response);
    });
});
app.post('/api/messages', async (request, response, next) => {
    try {
        await codex.send(String(request.body?.text || ''));
        response.status(202).json(codex.snapshot());
    } catch (error) { next(error); }
});
app.post('/api/interrupt', async (_request, response, next) => {
    try { await codex.interrupt(); response.status(204).end(); } catch (error) { next(error); }
});
app.post('/api/threads/new', async (_request, response, next) => {
    try { await codex.newThread(); response.status(201).json(codex.snapshot()); } catch (error) { next(error); }
});
app.get('/api/threads', async (_request, response, next) => {
    try { response.json({ data: await codex.listThreads(), activeThreadId: codex.threadId }); } catch (error) { next(error); }
});
app.post('/api/threads/:id/resume', async (request, response, next) => {
    try { await codex.resumeThread(request.params.id); response.json(codex.snapshot()); } catch (error) { next(error); }
});
app.post('/api/approvals/:id', (request, response, next) => {
    try {
        const decision = request.body?.decision === 'accept' ? 'accept' : 'decline';
        codex.approve(Number(request.params.id), decision);
        response.status(204).end();
    } catch (error) { next(error); }
});

app.use(express.static(publicDir));
app.get(/.*/, (_request, response) => response.sendFile(path.join(publicDir, 'index.html')));
app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
    response.status(400).json({ error: error.message });
});

void codex.start().catch(error => {
    codex.status = 'error';
    emit('status', codex.snapshot({ error: error.message }));
});

app.listen(port, host, () => {
    console.log(`Remote Codex: http://${host}:${port}`);
    console.log(`Workspace: ${workspace}`);
    if (access.generated) console.log(`First-run access token: ${access.token}`);
    else console.log(`Access token: ${process.env.REMOTE_CODEX_TOKEN ? 'from REMOTE_CODEX_TOKEN' : tokenFile}`);
});

let stopping = false;
let restartPending = false;
const shutdown = (exitCode = 0) => {
    if (stopping) return;
    stopping = true;
    void codex.stop().finally(() => process.exit(exitCode));
};
const applyDeferredRestart = () => {
    if (restartPending && !codex.isBusy()) shutdown(75);
};
const requestRestart = () => {
    if (codex.isBusy()) {
        restartPending = true;
        console.log('Remote Codex: restart deferred until the active turn completes');
        return;
    }
    shutdown(75);
};
process.on('message', (message: unknown) => {
    const type = (message as { type?: unknown } | null)?.type;
    if (type === 'restart-requested') requestRestart();
    else if (type === 'shutdown-requested') shutdown();
});
process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
