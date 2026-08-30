const $ = id => document.getElementById(id);
const login = $('login');
const app = $('app');
const messages = $('messages');
const prompt = $('prompt');
const status = $('status');
const stopButton = $('stop');
const sendButton = $('send');
const approval = $('approval');
let eventSource;
let activeApproval;
let assistantMessage;
let activeThreadId;
let turnStartedAt = 0;
let finalBoundaryAdded = false;
let activityState;
let previousMessageNodes = [];
let nextAssistantTimestamp = 0;
let workChip;

const scrollToBottom = (behavior = 'smooth') => {
    messages.scrollTo({ top: messages.scrollHeight, behavior });
};

const updateViewportHeight = () => {
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const offsetTop = viewport?.offsetTop || 0;
    document.documentElement.style.setProperty('--viewport-height', `${height}px`);
    document.documentElement.style.setProperty('--viewport-offset-top', `${offsetTop}px`);
};

const normalizeFileChanges = changes => {
    if (Array.isArray(changes)) return changes;
    if (!changes || typeof changes !== 'object') return [];
    return Object.entries(changes).map(([path, change]) => ({
        path,
        ...(change && typeof change === 'object' ? change : { diff: typeof change === 'string' ? change : '' })
    }));
};

const api = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
};

const appendInlineCode = (container, text) => {
    const parts = text.split(/(`[^`\n]+`)/g);
    parts.forEach(part => {
        if (part.startsWith('`') && part.endsWith('`')) {
            const code = document.createElement('code');
            code.className = 'inline-code';
            code.textContent = part.slice(1, -1);
            container.appendChild(code);
        } else {
            container.appendChild(document.createTextNode(part));
        }
    });
};

const createCodeBlock = (language, source) => {
    const block = document.createElement('div');
    block.className = 'code-block';
    const heading = document.createElement('div');
    heading.className = 'code-heading';
    const label = document.createElement('span');
    label.textContent = language || 'Код';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy-code';
    copy.textContent = 'Копировать';
    copy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(source);
            copy.textContent = 'Скопировано';
            setTimeout(() => { copy.textContent = 'Копировать'; }, 1400);
        } catch { copy.textContent = 'Не удалось'; }
    });
    heading.append(label, copy);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    if (language) code.className = `language-${language.replace(/[^a-z0-9_-]/gi, '')}`;
    code.textContent = source;
    pre.appendChild(code);
    block.append(heading, pre);
    return block;
};

const renderMarkdown = (element, markdown) => {
    const fragment = document.createDocumentFragment();
    const fence = /```([^\n`]*)\n([\s\S]*?)(?:\n```(?=\n|$)|$)/g;
    let offset = 0;
    let match;
    while ((match = fence.exec(markdown))) {
        appendInlineCode(fragment, markdown.slice(offset, match.index));
        fragment.appendChild(createCodeBlock(match[1].trim(), match[2]));
        offset = match.index + match[0].length;
    }
    appendInlineCode(fragment, markdown.slice(offset));
    element.replaceChildren(fragment);
};

const formatMessageTime = timestamp => new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const addMessage = (kind, text, timestamp = Date.now()) => {
    const element = document.createElement('div');
    element.className = `message ${kind}`;
    element.dataset.raw = text;
    if (kind === 'assistant' || kind === 'user') {
        const content = document.createElement('div');
        content.className = 'message-content';
        renderMarkdown(content, text);
        const time = document.createElement('time');
        time.className = 'message-time';
        time.dateTime = new Date(timestamp).toISOString();
        time.textContent = formatMessageTime(timestamp);
        time.title = new Date(timestamp).toLocaleString('ru-RU');
        element.append(content, time);
    } else element.textContent = text;
    messages.appendChild(element);
    if (kind === 'assistant' && !finalBoundaryAdded) previousMessageNodes.push(element);
    scrollToBottom();
    return element;
};

const hideWorkChip = () => {
    workChip?.remove();
    workChip = undefined;
};

const showWorkChip = label => {
    if (!workChip) {
        workChip = document.createElement('div');
        workChip.className = 'work-chip';
        const dot = document.createElement('span');
        dot.className = 'work-chip-dot';
        const text = document.createElement('span');
        text.className = 'work-chip-label';
        workChip.append(dot, text);
    }
    workChip.querySelector('.work-chip-label').textContent = label;
    messages.appendChild(workChip);
    scrollToBottom();
};

const activitySummary = (files, commands) => {
    const parts = [];
    if (files.size) parts.push(`Edited ${files.size} file${files.size === 1 ? '' : 's'}`);
    if (commands.size) parts.push(`ran ${commands.size} command${commands.size === 1 ? '' : 's'}`);
    return parts.join(', ') || 'Working…';
};

const createActivity = () => {
    const details = document.createElement('details');
    details.className = 'activity-card';
    const summary = document.createElement('summary');
    summary.textContent = 'Working…';
    const body = document.createElement('div');
    body.className = 'activity-body';
    details.append(summary, body);
    messages.appendChild(details);
    previousMessageNodes.push(details);
    return { details, summary, body, files: new Map(), commands: new Map() };
};

const updateActivity = state => {
    state.summary.textContent = activitySummary(state.files, state.commands);
    state.body.replaceChildren();
    state.files.forEach((stats, file) => {
        const row = document.createElement('div');
        row.className = 'activity-file';
        row.textContent = `Wrote ${file}${stats ? ` (${stats})` : ''}`;
        state.body.appendChild(row);
    });
    state.commands.forEach(command => {
        const row = document.createElement('details');
        row.className = 'activity-command';
        const label = document.createElement('summary');
        label.textContent = 'Ran command';
        const value = document.createElement('pre');
        value.textContent = command;
        row.append(label, value);
        state.body.appendChild(row);
    });
};

const fileStats = change => {
    if (!change?.diff || typeof change.diff !== 'string') return '';
    const lines = change.diff.split('\n');
    const additions = lines.filter(line => line.startsWith('+') && !line.startsWith('+++')).length;
    const deletions = lines.filter(line => line.startsWith('-') && !line.startsWith('---')).length;
    return `+${additions} -${deletions}`;
};

const collapsePreviousMessages = () => {
    const nodes = previousMessageNodes.filter(node => node.isConnected);
    if (!nodes.length) return;
    const details = document.createElement('details');
    details.className = 'previous-messages';
    const summary = document.createElement('summary');
    summary.textContent = `${nodes.length} previous message${nodes.length === 1 ? '' : 's'}`;
    const body = document.createElement('div');
    body.className = 'previous-messages-body';
    nodes[0].before(details);
    nodes.forEach(node => body.appendChild(node));
    details.append(summary, body);
    previousMessageNodes = [];
};

const addFinalBoundary = durationMs => {
    if (finalBoundaryAdded) return;
    hideWorkChip();
    collapsePreviousMessages();
    finalBoundaryAdded = true;
    assistantMessage = null;
    const boundary = document.createElement('div');
    boundary.className = 'final-boundary';
    const elapsed = Math.max(0, Math.round(durationMs / 1000));
    const label = document.createElement('span');
    label.textContent = `Worked for ${elapsed}s`;
    boundary.append(label, document.createElement('hr'));
    messages.appendChild(boundary);
};

const resetTurnUi = () => {
    hideWorkChip();
    assistantMessage = null;
    activityState = undefined;
    finalBoundaryAdded = false;
    previousMessageNodes = [];
    nextAssistantTimestamp = 0;
};

const updateStatus = state => {
    const labels = { starting: 'Запуск…', ready: 'Готов', running: 'Работает…', waiting: 'Ждёт решения', error: 'Ошибка' };
    status.textContent = labels[state.status] || state.status;
    status.className = `status ${state.status}`;
    const busy = state.status === 'running' || state.status === 'waiting';
    stopButton.classList.toggle('hidden', !busy);
    sendButton.disabled = busy;
    prompt.disabled = busy;
    activeThreadId = state.threadId || activeThreadId;
};

const threadTimestamp = thread => thread.updatedAt || thread.createdAt;
const threadLabel = thread => thread.name || thread.title || thread.preview || `Сессия ${thread.id.slice(0, 8)}`;
const renderThreads = ({ data = [], activeThreadId: activeId }) => {
    activeThreadId = activeId || activeThreadId;
    const list = $('threads-list');
    list.innerHTML = '';
    if (!data.length) {
        list.textContent = 'Сессии этого проекта не найдены.';
        return;
    }
    data.forEach(thread => {
        const button = document.createElement('button');
        button.className = `thread-row${thread.id === activeThreadId ? ' active' : ''}`;
        const label = document.createElement('strong');
        label.textContent = threadLabel(thread);
        const meta = document.createElement('span');
        const timestamp = threadTimestamp(thread);
        meta.textContent = timestamp ? new Date(timestamp * 1000).toLocaleString('ru-RU') : thread.id.slice(0, 12);
        button.append(label, meta);
        button.addEventListener('click', async () => {
            if (thread.id === activeThreadId) {
                $('threads-panel').classList.add('hidden');
                return;
            }
            try {
                await api(`/api/threads/${encodeURIComponent(thread.id)}/resume`, { method: 'POST' });
                activeThreadId = thread.id;
                $('threads-panel').classList.add('hidden');
            } catch (error) { addMessage('error', error.message); }
        });
        list.appendChild(button);
    });
};

const openThreads = async () => {
    const panel = $('threads-panel');
    panel.classList.remove('hidden');
    $('threads-list').textContent = 'Загрузка…';
    try { renderThreads(await api('/api/threads')); }
    catch (error) { $('threads-list').textContent = error.message; }
};

const renderItem = ({ method, item, startedAtMs }) => {
    if (!item) return;
    if (item.type === 'agentMessage' && method === 'item/started') {
        hideWorkChip();
        nextAssistantTimestamp = startedAtMs || Date.now();
        activityState = undefined;
        if (item.phase === 'final_answer') addFinalBoundary(turnStartedAt ? Date.now() - turnStartedAt : 0);
    } else if (item.type === 'agentMessage' && method === 'item/completed') {
        if (!assistantMessage) addMessage('assistant', item.text || '', nextAssistantTimestamp || Date.now());
        assistantMessage = null;
        if (item.phase !== 'final_answer') showWorkChip('Thinking');
    } else if (item.type === 'commandExecution') {
        if (method === 'item/started') hideWorkChip();
        if (!activityState) activityState = createActivity();
        activityState.commands.set(item.id || item.command, item.command);
        updateActivity(activityState);
        if (method === 'item/completed') showWorkChip('Thinking');
    } else if (item.type === 'fileChange') {
        if (!activityState) activityState = createActivity();
        normalizeFileChanges(item.changes).forEach(change => {
            const file = change.path || change.file || '';
            if (file) activityState.files.set(file, fileStats(change));
        });
        updateActivity(activityState);
        showWorkChip(method === 'item/started' ? 'Editing' : 'Thinking');
    }
};

const renderHistory = ({ turns = [] }) => {
    messages.innerHTML = '';
    for (const turn of turns) {
        resetTurnUi();
        turnStartedAt = turn.startedAt ? turn.startedAt * 1000 : 0;
        for (const item of turn.items || []) {
            if (item.type === 'userMessage') {
                const text = (item.content || []).filter(part => part.type === 'text').map(part => part.text).join('\n');
                if (text) addMessage('user', text, (turn.startedAt || turn.completedAt) * 1000 || Date.now());
            } else if (item.type === 'agentMessage' && item.text) {
                activityState = undefined;
                if (item.phase === 'final_answer') addFinalBoundary(turn.durationMs || ((turn.completedAt - turn.startedAt) * 1000) || 0);
                addMessage('assistant', item.text, (turn.completedAt || turn.startedAt) * 1000 || Date.now());
            } else if (item.type === 'commandExecution') {
                if (!activityState) activityState = createActivity();
                activityState.commands.set(item.id || item.command, item.command);
                updateActivity(activityState);
            } else if (item.type === 'fileChange') {
                if (!activityState) activityState = createActivity();
                normalizeFileChanges(item.changes).forEach(change => {
                    const file = change.path || change.file || '';
                    if (file) activityState.files.set(file, fileStats(change));
                });
                updateActivity(activityState);
            }
        }
    }
};

const connect = () => {
    eventSource?.close();
    eventSource = new EventSource('/api/events');
    const on = (name, handler) => eventSource.addEventListener(name, event => handler(JSON.parse(event.data)));
    on('status', updateStatus);
    on('reset', state => { messages.innerHTML = ''; resetTurnUi(); updateStatus(state); });
    on('history', renderHistory);
    on('user', data => {
        resetTurnUi();
        turnStartedAt = data.timestamp || Date.now();
        addMessage('user', data.text, turnStartedAt);
        showWorkChip('Thinking');
    });
    on('assistant-delta', data => {
        hideWorkChip();
        if (!assistantMessage) assistantMessage = addMessage('assistant', '', nextAssistantTimestamp || Date.now());
        assistantMessage.dataset.raw = `${assistantMessage.dataset.raw || ''}${data.delta || ''}`;
        renderMarkdown(assistantMessage.querySelector('.message-content'), assistantMessage.dataset.raw);
        scrollToBottom('auto');
    });
    on('item', renderItem);
    on('turn-completed', () => hideWorkChip());
    on('approval', data => {
        activeApproval = data;
        const params = data.params || {};
        $('approval-command').textContent = params.command || params.grantRoot || 'Изменение файлов';
        $('approval-reason').textContent = params.reason || '';
        approval.classList.remove('hidden');
    });
    on('approval-resolved', () => { activeApproval = null; approval.classList.add('hidden'); });
    on('log', data => addMessage('log', data.text || ''));
    on('error', data => addMessage('error', data.message || JSON.stringify(data)));
    eventSource.onerror = () => { status.textContent = 'Переподключение…'; status.className = 'status error'; };
};

const bootstrap = async () => {
    const session = await api('/api/session');
    if (!session.authenticated) {
        login.classList.remove('hidden');
        return;
    }
    login.classList.add('hidden');
    app.classList.remove('hidden');
    connect();
    updateStatus(await api('/api/state'));
    try {
        renderHistory(await api('/api/history'));
    } catch (error) {
        addMessage('error', `Не удалось восстановить историю: ${error.message}`);
    }
};

$('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('login-error').textContent = '';
    try {
        await api('/api/login', { method: 'POST', body: JSON.stringify({ token: $('token').value }) });
        login.classList.add('hidden');
        app.classList.remove('hidden');
        updateStatus(await api('/api/state'));
        renderHistory(await api('/api/history'));
        connect();
    } catch (error) { $('login-error').textContent = error.message; }
});

$('composer').addEventListener('submit', async event => {
    event.preventDefault();
    const text = prompt.value.trim();
    if (!text) return;
    prompt.value = '';
    try { await api('/api/messages', { method: 'POST', body: JSON.stringify({ text }) }); }
    catch (error) { addMessage('error', error.message); }
});

prompt.addEventListener('input', () => {
    prompt.style.height = 'auto';
    prompt.style.height = `${Math.min(prompt.scrollHeight, 150)}px`;
});
prompt.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    $('composer').requestSubmit();
});
prompt.addEventListener('focus', () => {
    [0, 100, 300].forEach(delay => setTimeout(() => {
        updateViewportHeight();
        scrollToBottom('auto');
    }, delay));
});
window.visualViewport?.addEventListener('resize', updateViewportHeight);
window.visualViewport?.addEventListener('scroll', updateViewportHeight);
window.addEventListener('resize', updateViewportHeight);
updateViewportHeight();
$('stop').addEventListener('click', () => api('/api/interrupt', { method: 'POST' }).catch(error => addMessage('error', error.message)));
$('threads-button').addEventListener('click', openThreads);
$('threads-close').addEventListener('click', () => $('threads-panel').classList.add('hidden'));
$('new-thread').addEventListener('click', async () => {
    if (!confirm('Начать новый диалог?')) return;
    try { await api('/api/threads/new', { method: 'POST' }); }
    catch (error) { addMessage('error', error.message); }
});
const decide = decision => {
    if (!activeApproval) return;
    api(`/api/approvals/${activeApproval.requestId}`, { method: 'POST', body: JSON.stringify({ decision }) })
        .catch(error => addMessage('error', error.message));
};
$('accept').addEventListener('click', () => decide('accept'));
$('decline').addEventListener('click', () => decide('decline'));

void bootstrap().catch(error => {
    app.classList.remove('hidden');
    addMessage('error', `Не удалось подключиться к Remote Codex: ${error.message}`);
});
