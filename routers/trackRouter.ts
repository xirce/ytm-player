import { Router } from 'express';
import { Readable } from 'node:stream';
import { performance } from 'node:perf_hooks';
import ytmusic from '../utils/YTMusicApiWrapper';
import { requireUser } from '../middleware/appAuth';
import { personalMusicClients } from '../utils/personalMusicClient';
import type { TrackUrlTimings } from '../utils/YTMusicApiWrapper';
import type { ITrackPlaybackSource } from '../shared';
import { asyncHandler, HttpError } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';
import { recordSabrHedge, recordSabrProxyStage } from '../utils/metrics';

const router = Router();
const mediaRequestNumbers = new Map<string, number>();
let sabrDiagnosticSequence = 0;

interface SabrProxyDiagnostic {
    createdAt: number;
    upstreamReadCompleteMs?: number;
    downstreamFirstWriteMs?: number;
    downstreamFinishMs?: number;
    downstreamCloseMs?: number;
    prematureClose?: boolean;
    firstBackpressureMs?: number;
    lastDrainMs?: number;
    backpressureCount: number;
}

const sabrProxyDiagnostics = new Map<string, SabrProxyDiagnostic>();

function pruneSabrProxyDiagnostics(): void {
    const cutoff = Date.now() - 60_000;
    for (const [id, diagnostic] of sabrProxyDiagnostics) {
        if (diagnostic.createdAt < cutoff) sabrProxyDiagnostics.delete(id);
    }
}

function isAllowedMediaUrl(url: URL): boolean {
    return url.protocol === 'https:' &&
        (url.hostname === 'googlevideo.com' || url.hostname.endsWith('.googlevideo.com'));
}

async function logUpstreamError(response: Response, mediaUrl: URL, requestedRange?: string): Promise<void> {
    let body = '';
    try {
        body = (await response.text()).slice(0, 2048);
    } catch (error) {
        body = `<failed to read response body: ${(error as Error).message}>`;
    }

    const responseHeaders = Object.fromEntries(
        ['content-type', 'content-length', 'content-range', 'server', 'date', 'x-restrict-formats-hint']
            .map(name => [name, response.headers.get(name)])
            .filter((entry): entry is [string, string] => entry[1] !== null)
    );

    console.error('YouTube media request failed', {
        status: response.status,
        statusText: response.statusText,
        host: mediaUrl.hostname,
        itag: mediaUrl.searchParams.get('itag'),
        client: mediaUrl.searchParams.get('c'),
        expiresAt: mediaUrl.searchParams.get('expire'),
        contentLength: mediaUrl.searchParams.get('clen'),
        requestedRange,
        upstreamRange: mediaUrl.searchParams.get('range'),
        requestNumber: mediaUrl.searchParams.get('rn'),
        requestedBuffer: mediaUrl.searchParams.get('rbuf'),
        hasPoToken: mediaUrl.searchParams.has('pot'),
        hasNParameter: mediaUrl.searchParams.has('n'),
        responseHeaders,
        body
    });
}

function applyRangeQuery(mediaUrl: URL, range: string): void {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) throw new HttpError(416, 'Unsupported Range header');

    const contentLength = Number(mediaUrl.searchParams.get('clen'));
    const end = match[2] || (Number.isSafeInteger(contentLength) && contentLength > 0
        ? String(contentLength - 1)
        : null);
    if (!end) throw new HttpError(416, 'Cannot determine range end');
    mediaUrl.searchParams.set('range', `${match[1]}-${end}`);
}

interface TrackUrlResponse {
    source: ITrackPlaybackSource;
    timings: TrackUrlTimings;
}

async function fetchTrackUrl(id: string, proxyBaseUrl: string): Promise<TrackUrlResponse> {
    const result = await ytmusic.getTrackUrl(
        id,
        undefined,
        mediaUrl => {
            const proxyUrl = new URL('/api/tracks/proxy', proxyBaseUrl);
            proxyUrl.searchParams.set('url', mediaUrl.toString());
            return proxyUrl;
        }
    );
    const { manifest, timings } = result;

    if (!manifest || !result.streamingUrl || !result.ustreamerConfig)
        throw new Error(`No SABR playback data for track: ${id}`);

    const base64 = Buffer.from(manifest, 'utf8').toString('base64');
    const proxyUrl = new URL('/api/tracks/sabr-proxy', proxyBaseUrl);
    proxyUrl.searchParams.set('url', result.streamingUrl);
    return {
        source: {
            manifest: `data:application/dash+xml;charset=utf-8;base64,${base64}`,
            sabr: {
                streamingUrl: proxyUrl.toString(),
                ustreamerConfig: result.ustreamerConfig,
                poToken: result.poToken,
                clientInfo: result.clientInfo,
                formats: result.formats
            }
        },
        timings
    };
}

router.post('/sabr-proxy', asyncHandler(async (req, res) => {
    const requestReceivedAt = performance.now();
    pruneSabrProxyDiagnostics();
    const diagnosticId = `${Date.now().toString(36)}-${++sabrDiagnosticSequence}`;
    const diagnostic: SabrProxyDiagnostic = { createdAt: Date.now(), backpressureCount: 0 };
    sabrProxyDiagnostics.set(diagnosticId, diagnostic);
    res.setHeader('X-Sabr-Diagnostic-Id', diagnosticId);
    if (typeof req.query.url !== 'string') throw new HttpError(400, 'Query parameter "url" is required');
    const hedgeRequested = req.query.hedge === '1';
    const hedgeMeasurementStartedAt = performance.now();
    let mediaUrl: URL;
    try {
        mediaUrl = new URL(req.query.url);
    } catch {
        throw new HttpError(400, 'Invalid media URL');
    }
    if (!isAllowedMediaUrl(mediaUrl)) throw new HttpError(403, 'Media URL is not allowed');
    if (typeof req.query.rn === 'string') mediaUrl.searchParams.set('rn', req.query.rn);

    const chunks: Uint8Array[] = [];
    let bodyLength = 0;
    for await (const chunk of req) {
        const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk);
        chunks.push(bytes);
        bodyLength += bytes.byteLength;
    }
    const body = new Uint8Array(bodyLength);
    let bodyOffset = 0;
    for (const chunk of chunks) {
        body.set(chunk, bodyOffset);
        bodyOffset += chunk.byteLength;
    }
    const requestBodyReadAt = performance.now();
    const controllers = new Set<AbortController>();
    let completed = false;
    let clientClosed = false;
    let upstreamReadCompleted = false;
    let upstreamReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const abortUpstream = () => {
        if (completed) return;
        clientClosed = true;
        controllers.forEach(controller => controller.abort());
        void upstreamReader?.cancel().catch(() => undefined);
    };
    const markCompleted = () => {
        completed = true;
        res.off('close', abortUpstream);
    };
    const markUpstreamReadCompleted = () => {
        if (upstreamReadCompleted) return;
        upstreamReadCompleted = true;
        diagnostic.upstreamReadCompleteMs = performance.now() - requestReceivedAt;
        recordSabrProxyStage('upstream_read_complete', diagnostic.upstreamReadCompleteMs);
    };
    const markDownstreamWriteCompleted = () => {
        diagnostic.downstreamFinishMs = performance.now() - requestReceivedAt;
        recordSabrProxyStage('downstream_write_complete', diagnostic.downstreamFinishMs);
        markCompleted();
    };
    const markDownstreamClosed = () => {
        diagnostic.downstreamCloseMs = performance.now() - requestReceivedAt;
        diagnostic.prematureClose = !res.writableFinished;
    };
    res.once('close', abortUpstream);
    res.once('close', markDownstreamClosed);
    res.once('finish', markDownstreamWriteCompleted);

    let upstream: Response;
    let upstreamController: AbortController;
    let upstreamHeadersAt: number;
    let hedgeTimings: string[] = [];
    try {
        type AttemptName = 'primary' | 'hedge';
        type Attempt = {
            name: AttemptName;
            controller: AbortController;
            startedAt: number;
            settledAt?: number;
            response: Promise<Response>;
        };
        type AttemptResult =
            | { ok: true; attempt: Attempt; response: Response; settledAt: number }
            | { ok: false; attempt: Attempt; error: unknown; settledAt: number };
        const startAttempt = (name: AttemptName): Attempt => {
            const controller = new AbortController();
            controllers.add(controller);
            return {
                name,
                controller,
                startedAt: performance.now(),
                response: fetch(mediaUrl, {
                    method: 'POST',
                    headers: { 'content-type': req.get('content-type') || 'application/x-protobuf' },
                    body: body.buffer,
                    signal: controller.signal
                })
            };
        };
        const settle = (attempt: Attempt): Promise<AttemptResult> => attempt.response.then(
            response => {
                const settledAt = performance.now();
                attempt.settledAt = settledAt;
                return { ok: true, attempt, response, settledAt };
            },
            error => {
                const settledAt = performance.now();
                attempt.settledAt = settledAt;
                return { ok: false, attempt, error, settledAt };
            }
        );

        const primary = startAttempt('primary');
        let hedge: Attempt | undefined;
        let winner: AttemptResult;
        if (hedgeRequested) {
            let delayTimer: ReturnType<typeof setTimeout> | undefined;
            const delay = new Promise<null>(resolve => {
                delayTimer = setTimeout(() => resolve(null), 500);
            });
            const primaryResult = settle(primary);
            const beforeHedge = await Promise.race([primaryResult, delay]);
            if (beforeHedge?.ok) {
                winner = beforeHedge;
            } else {
                if (clientClosed) throw beforeHedge && !beforeHedge.ok ? beforeHedge.error : new Error('Client closed');
                hedge = startAttempt('hedge');
                const hedgeResult = settle(hedge);
                if (beforeHedge === null) {
                    const first = await Promise.race([primaryResult, hedgeResult]);
                    winner = first.ok
                        ? first
                        : await (first.attempt === primary ? hedgeResult : primaryResult);
                } else {
                    winner = await hedgeResult;
                }
            }
            if (delayTimer) clearTimeout(delayTimer);
        } else {
            winner = await settle(primary);
        }
        if (!winner.ok) throw winner.error;
        upstream = winner.response;
        upstreamController = winner.attempt.controller;
        upstreamHeadersAt = winner.settledAt;
        if (hedgeRequested) {
            recordSabrHedge(
                hedge ? (winner.attempt.name === 'hedge' ? 'hedge_won' : 'primary_won') : 'not_launched',
                winner.settledAt - primary.startedAt
            );
            const loser = hedge && winner.attempt === primary ? hedge : hedge ? primary : undefined;
            const loserAborted = loser?.settledAt === undefined;
            hedgeTimings = [
                `sabr-hedge-launched;dur=${hedge ? 1 : 0}`,
                `sabr-hedge-winner;dur=${winner.attempt.name === 'hedge' ? 1 : 0}`,
                `sabr-hedge-winner-ms;dur=${(winner.settledAt - winner.attempt.startedAt).toFixed(1)}`,
                `sabr-hedge-total-ms;dur=${(winner.settledAt - primary.startedAt).toFixed(1)}`,
                ...(loser ? [
                    `sabr-hedge-loser-ms;dur=${((loser.settledAt ?? winner.settledAt) - loser.startedAt).toFixed(1)}`,
                    `sabr-hedge-loser-aborted;dur=${loserAborted ? 1 : 0}`
                ] : [])
            ];
        }
        controllers.forEach(controller => {
            if (controller !== upstreamController) controller.abort();
        });
    } catch (error) {
        res.off('close', abortUpstream);
        res.off('finish', markDownstreamWriteCompleted);
        if (clientClosed) return;
        if (hedgeRequested) recordSabrHedge('failed', performance.now() - hedgeMeasurementStartedAt);
        throw error;
    }
    res.status(upstream.status);
    for (const header of ['content-type', 'content-length']) {
        const value = upstream.headers.get(header);
        if (value) res.setHeader(header, value);
    }
    if (!upstream.body) {
        res.setHeader('Server-Timing', [
            ...hedgeTimings,
            `sabr-request-body-ms;dur=${(requestBodyReadAt - requestReceivedAt).toFixed(1)}`,
            `sabr-upstream-headers-ms;dur=${(upstreamHeadersAt - requestReceivedAt).toFixed(1)}`
        ].join(', '));
        markUpstreamReadCompleted();
        return void res.end();
    }
    const reader = upstream.body.getReader();
    let firstChunk: ReadableStreamReadResult<Uint8Array>;
    try {
        firstChunk = await reader.read();
    } catch (error) {
        reader.releaseLock();
        res.off('finish', markDownstreamWriteCompleted);
        if (clientClosed) return;
        throw error;
    }
    const upstreamFirstByteAt = performance.now();
    const downstreamFirstWriteAt = performance.now();
    diagnostic.downstreamFirstWriteMs = downstreamFirstWriteAt - requestReceivedAt;
    res.setHeader('Server-Timing', [
        ...hedgeTimings,
        `sabr-request-body-ms;dur=${(requestBodyReadAt - requestReceivedAt).toFixed(1)}`,
        `sabr-upstream-headers-ms;dur=${(upstreamHeadersAt - requestReceivedAt).toFixed(1)}`,
        `sabr-upstream-first-byte-ms;dur=${(upstreamFirstByteAt - requestReceivedAt).toFixed(1)}`,
        `sabr-downstream-first-write-ms;dur=${(downstreamFirstWriteAt - requestReceivedAt).toFixed(1)}`
    ].join(', '));
    if (firstChunk.done) {
        reader.releaseLock();
        markUpstreamReadCompleted();
        return void res.end();
    }
    upstreamReader = reader;
    const writeChunk = async (chunk: Uint8Array): Promise<void> => {
        if (res.write(chunk)) return;
        diagnostic.backpressureCount += 1;
        diagnostic.firstBackpressureMs ??= performance.now() - requestReceivedAt;
        await new Promise<void>(resolve => {
            const done = () => {
                res.off('drain', onDrain);
                res.off('close', done);
                resolve();
            };
            const onDrain = () => {
                diagnostic.lastDrainMs = performance.now() - requestReceivedAt;
                done();
            };
            res.once('drain', onDrain);
            res.once('close', done);
        });
    };
    try {
        await writeChunk(firstChunk.value);
        while (!clientClosed) {
            const chunk = await reader.read();
            if (chunk.done) {
                markUpstreamReadCompleted();
                break;
            }
            await writeChunk(chunk.value);
        }
        if (!clientClosed) res.end();
    } catch (error) {
        if (!clientClosed && !upstreamController.signal.aborted) res.destroy(error as Error);
    } finally {
        reader.releaseLock();
    }
}));

router.get('/sabr-proxy-diagnostic', asyncHandler(async (req, res) => {
    if (typeof req.query.id !== 'string') throw new HttpError(400, 'Query parameter "id" is required');
    const diagnostic = sabrProxyDiagnostics.get(req.query.id);
    if (!diagnostic) throw new HttpError(404, 'SABR diagnostic not found');
    const deadline = performance.now() + 5_000;
    while (diagnostic.downstreamCloseMs === undefined && performance.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    res.json({
        upstreamReadCompleteMs: diagnostic.upstreamReadCompleteMs,
        downstreamFirstWriteMs: diagnostic.downstreamFirstWriteMs,
        downstreamFinishMs: diagnostic.downstreamFinishMs,
        downstreamCloseMs: diagnostic.downstreamCloseMs,
        prematureClose: diagnostic.prematureClose,
        firstBackpressureMs: diagnostic.firstBackpressureMs,
        lastDrainMs: diagnostic.lastDrainMs,
        backpressureCount: diagnostic.backpressureCount
    });
}));

function formatServerTiming(timings: TrackUrlTimings): string {
    return [
        ['po-token', timings.poToken],
        ['player-info', timings.playerInfo],
        ['dash-manifest', timings.dashManifest],
        ['track-url-total', timings.total]
    ].map(([name, duration]) => `${name};dur=${Number(duration).toFixed(1)}`).join(', ');
}

router.get('/proxy', asyncHandler(async (req, res) => {
    if (typeof req.query.url !== 'string') {
        throw new HttpError(400, 'Query parameter "url" is required');
    }

    let mediaUrl: URL;
    try {
        mediaUrl = new URL(req.query.url);
    } catch {
        throw new HttpError(400, 'Invalid media URL');
    }
    if (!isAllowedMediaUrl(mediaUrl)) {
        throw new HttpError(403, 'Media URL is not allowed');
    }

    const mediaKey = mediaUrl.toString();
    if (req.headers.range) applyRangeQuery(mediaUrl, req.headers.range);

    const requestNumber = (mediaRequestNumbers.get(mediaKey) ?? 0) + 1;
    mediaRequestNumbers.set(mediaKey, requestNumber);
    mediaUrl.searchParams.set('rn', String(requestNumber));

    const upstreamStartedAt = performance.now();
    const upstream = await fetch(mediaUrl);
    const serverTimings = [`googlevideo-headers;dur=${(performance.now() - upstreamStartedAt).toFixed(1)}`];
    const upstreamLength = Number(upstream.headers.get('content-length'));
    if (Number.isFinite(upstreamLength)) serverTimings.push(`upstream-bytes;dur=${upstreamLength}`);
    const requestedRange = /^(\d+)-(\d+)$/.exec(mediaUrl.searchParams.get('range') ?? '');
    if (requestedRange) {
        serverTimings.push(`range-start;dur=${requestedRange[1]}`);
        serverTimings.push(`range-end;dur=${requestedRange[2]}`);
    }
    serverTimings.push(`request-number;dur=${requestNumber}`);
    res.setHeader('Server-Timing', serverTimings.join(', '));
    res.status(upstream.status);

    for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(header);
        if (value) res.setHeader(header, value);
    }

    if (!upstream.ok) {
        await logUpstreamError(upstream, mediaUrl, req.headers.range);
        res.end();
        return;
    }

    if (!upstream.body) {
        res.end();
        return;
    }

    Readable.from(upstream.body as unknown as AsyncIterable<Uint8Array>)
        .on('error', error => {
            console.error('Track proxy stream error', error);
            res.destroy(error as Error);
        })
        .pipe(res);
}));

router.get('/:id/url', asyncHandler(async (req, res) => {
    const id = getRequiredParam(req, 'id');
    let proxyBaseUrl = `${req.protocol}://${req.get('host')}`;
    if (typeof req.query.origin === 'string') {
        let clientOrigin: URL;
        try {
            clientOrigin = new URL(req.query.origin);
        } catch {
            throw new HttpError(400, 'Query parameter "origin" must be a valid URL');
        }
        if (clientOrigin.protocol !== 'http:' && clientOrigin.protocol !== 'https:') {
            throw new HttpError(400, 'Query parameter "origin" must use HTTP or HTTPS');
        }
        proxyBaseUrl = clientOrigin.origin;
    }
    const { source, timings } = await fetchTrackUrl(id, proxyBaseUrl);
    res.setHeader('Server-Timing', formatServerTiming(timings));
    res.json(source);
}));

router.post('/:id/history', requireUser, asyncHandler(async (req, res) => {
    await (await personalMusicClients.get(req.user!.id)).addTrackToHistory(getRequiredParam(req, 'id'));
    res.status(204).end();
}));



export default router;
