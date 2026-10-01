interface PlaybackMeasurement {
    trackId: string;
    title?: string;
    startedAt: number;
    stages: Map<string, number>;
    mediaRequests: MediaRequest[];
    sourceTiming?: ResourceTimingWithServerTiming;
    sabrProxyDiagnostics: Partial<Record<MediaRequestKind, SabrProxyDiagnosticMeasurement>>;
    completedResult?: PlaybackTimingResult;
}

export interface SabrProxyDiagnosticMeasurement {
    upstreamReadCompleteMs?: number;
    downstreamFirstWriteMs?: number;
    downstreamFinishMs?: number;
    downstreamCloseMs?: number;
    prematureClose?: boolean;
    firstBackpressureMs?: number;
    lastDrainMs?: number;
    backpressureCount: number;
}

type MediaRequestKind = 'index' | 'init' | 'media';

interface MediaRequest {
    kind: MediaRequestKind;
    url: string;
    range?: string;
    startedAt: number;
    responseHash?: string;
    prefixHash?: string;
    mediaEndBytes?: number;
    coalescingStatus?: string;
    networkRange?: string;
    expectedBytes?: number;
    actualBytes?: number;
    resourceTiming?: ResourceTimingWithServerTiming;
}

interface MatchedMediaTiming {
    request: MediaRequest;
    timing?: ResourceTimingWithServerTiming;
}

export interface PlaybackTimingMetric {
    label: string;
    durationMs: number;
    detail?: string;
}

export interface PlaybackTimingResult {
    trackId: string;
    title: string;
    totalMs: number;
    metrics: PlaybackTimingMetric[];
}

export const PLAYBACK_TIMING_EVENT = 'playback-timing-complete';

type PlaybackTelemetryStage =
    | 'source' | 'po_token' | 'player_api' | 'dash_manifest' | 'dash_initialization' | 'mpd'
    | 'index_wait' | 'index_download' | 'init_wait' | 'init_download'
    | 'first_media_wait' | 'first_media_download' | 'media_append'
    | 'index_network' | 'init_network' | 'first_media_network'
    | 'index_upstream_headers' | 'init_upstream_headers' | 'first_media_upstream_headers'
    | 'index_upstream_first_byte' | 'init_upstream_first_byte' | 'first_media_upstream_first_byte'
    | 'index_downstream_first_write' | 'init_downstream_first_write' | 'first_media_downstream_first_write'
    | 'loaded_metadata' | 'can_play' | 'buffer_to_audio' | 'after_initialization';

function reportPlaybackTelemetry(
    totalMs: number,
    stages: Partial<Record<PlaybackTelemetryStage, number>>
): void {
    const body = JSON.stringify({ totalMs, stages });
    if (navigator.sendBeacon?.('/api/playback-telemetry', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/playback-telemetry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true
    }).catch(() => undefined);
}

type ResourceTimingWithServerTiming = Pick<PerformanceResourceTiming,
    'name' | 'entryType' | 'startTime' | 'duration' | 'responseStart' | 'responseEnd' | 'encodedBodySize'> & {
    serverTiming?: ReadonlyArray<{ name: string; duration: number; description?: string }>;
};

const measurements = new Map<string, PlaybackMeasurement>();
const RESOURCE_TIMING_BUFFER_SIZE = 2000;

const round = (value: number) => Math.round(value * 10) / 10;

export function beginPlaybackMeasurement(trackId: string, title?: string): void {
    const startedAt = performance.now();
    measurements.set(trackId, {
        trackId,
        title,
        startedAt,
        stages: new Map([['selection', startedAt]]),
        mediaRequests: [],
        sabrProxyDiagnostics: {}
    });

    if (measurements.size > 10) {
        measurements.delete(measurements.keys().next().value as string);
    }
}

export function ensurePlaybackMeasurement(trackId: string, title?: string): void {
    if (!measurements.has(trackId)) beginPlaybackMeasurement(trackId, title);
}

export function markPlaybackStage(trackId: string | undefined, stage: string): void {
    if (!trackId) return;
    measurements.get(trackId)?.stages.set(stage, performance.now());
}

export function markPlaybackStageOnce(trackId: string | undefined, stage: string): void {
    if (!trackId) return;
    const stages = measurements.get(trackId)?.stages;
    if (stages && !stages.has(stage)) stages.set(stage, performance.now());
}

export function recordPlaybackMediaRequest(
    trackId: string | undefined,
    kind: MediaRequestKind,
    url: string | null | undefined,
    range?: string | null,
    diagnostics?: Partial<Pick<MediaRequest,
        'coalescingStatus' | 'networkRange' | 'expectedBytes' | 'actualBytes'>>
): void {
    if (!trackId || !url) return;
    const requests = measurements.get(trackId)?.mediaRequests;
    if (!requests) return;
    const normalizedRange = range ?? undefined;
    const now = performance.now();
    const previous = requests[requests.length - 1];
    // Shaka and the SABR adapter report the same physical request independently.
    if (previous?.kind === kind
        && previous.url === url
        && previous.range === normalizedRange
        && now - previous.startedAt < 100) {
        Object.assign(previous, diagnostics);
        return;
    }
    requests.push({ kind, url, range: normalizedRange, startedAt: now, ...diagnostics });
}

export function recordPlaybackMediaDiagnostics(
    trackId: string | undefined,
    kind: MediaRequestKind,
    diagnostics: Pick<MediaRequest, 'url' | 'range'> & Partial<Pick<MediaRequest,
        'responseHash' | 'prefixHash' | 'mediaEndBytes' | 'coalescingStatus' | 'networkRange'
        | 'expectedBytes' | 'actualBytes' | 'resourceTiming'>>
): void {
    if (!trackId) return;
    const requests = measurements.get(trackId)?.mediaRequests;
    const request = requests?.slice().reverse().find(item => item.kind === kind
        && item.url === diagnostics.url
        && item.range === diagnostics.range)
        ?? requests?.slice().reverse().find(item => item.kind === kind);
    if (request) Object.assign(request, diagnostics);
}

const sabrProxyDiagnosticMetric = (
    kind: MediaRequestKind,
    diagnostic: SabrProxyDiagnosticMeasurement
): PlaybackTimingMetric => {
    const label = kind === 'index' ? 'Index' : kind === 'init' ? 'Init' : 'Первый media';
    const terminalMs = diagnostic.downstreamFinishMs ?? diagnostic.downstreamCloseMs
        ?? diagnostic.upstreamReadCompleteMs ?? diagnostic.downstreamFirstWriteMs ?? 0;
    return {
        label: `${label}: серверное завершение`,
        durationMs: round(terminalMs),
        detail: [
            diagnostic.upstreamReadCompleteMs !== undefined
                ? `upstream завершён ${Math.round(diagnostic.upstreamReadCompleteMs)} мс` : 'upstream не завершён',
            diagnostic.downstreamFirstWriteMs !== undefined
                ? `первый write ${Math.round(diagnostic.downstreamFirstWriteMs)} мс` : undefined,
            diagnostic.downstreamFinishMs !== undefined
                ? `finish ${Math.round(diagnostic.downstreamFinishMs)} мс` : undefined,
            diagnostic.downstreamCloseMs !== undefined
                ? `close ${Math.round(diagnostic.downstreamCloseMs)} мс${diagnostic.prematureClose ? ' (досрочно)' : ''}` : undefined,
            diagnostic.backpressureCount
                ? `backpressure ×${diagnostic.backpressureCount} с ${Math.round(diagnostic.firstBackpressureMs ?? 0)} мс`
                    + (diagnostic.lastDrainMs !== undefined ? ` · drain ${Math.round(diagnostic.lastDrainMs)} мс` : ' · drain не было')
                : 'backpressure нет'
        ].filter(Boolean).join(' · ')
    };
};

export function recordPlaybackSabrProxyDiagnostic(
    trackId: string | undefined,
    kind: MediaRequestKind,
    diagnostic: SabrProxyDiagnosticMeasurement
): void {
    if (!trackId) return;
    const measurement = measurements.get(trackId);
    if (!measurement) return;
    if (measurement.sabrProxyDiagnostics[kind]) return;
    measurement.sabrProxyDiagnostics[kind] = diagnostic;
    if (!measurement.completedResult) return;
    const metric = sabrProxyDiagnosticMetric(kind, diagnostic);
    measurement.completedResult.metrics = [
        ...measurement.completedResult.metrics.filter(item => item.label !== metric.label),
        metric
    ];
    window.dispatchEvent(new CustomEvent<PlaybackTimingResult>(PLAYBACK_TIMING_EVENT, {
        detail: measurement.completedResult
    }));
}

function resourceTimingEntries(measurement: PlaybackMeasurement): ResourceTimingWithServerTiming[] {
    return performance.getEntriesByType('resource')
        .filter((entry): entry is PerformanceResourceTiming => entry.entryType === 'resource')
        .map(entry => entry as ResourceTimingWithServerTiming)
        .filter(entry => entry.startTime >= measurement.startedAt - 50);
}

function findTrackUrlTiming(measurement: PlaybackMeasurement): ResourceTimingWithServerTiming | undefined {
    if (measurement.sourceTiming) return measurement.sourceTiming;
    const path = `/api/tracks/${encodeURIComponent(measurement.trackId)}/url`;
    return resourceTimingEntries(measurement)
        .filter(entry => entry.name.includes(path))
        .at(-1);
}

function findMediaTimings(measurement: PlaybackMeasurement): MatchedMediaTiming[] {
    const entries = resourceTimingEntries(measurement);
    const usedEntries = new Set<ResourceTimingWithServerTiming>(
        measurement.mediaRequests.flatMap(request => request.resourceTiming ? [request.resourceTiming] : [])
    );
    return measurement.mediaRequests.map(request => {
        const timing = request.resourceTiming ?? entries
            .filter(entry => entry.name === request.url && !usedEntries.has(entry))
            .sort((left, right) => Math.abs(left.startTime - request.startedAt)
                - Math.abs(right.startTime - request.startedAt))[0];
        if (timing) usedEntries.add(timing);
        return { request, timing };
    });
}

function preserveActiveResourceTimings(): void {
    measurements.forEach(measurement => {
        measurement.sourceTiming ??= findTrackUrlTiming(measurement);
        findMediaTimings(measurement).forEach(({ request, timing }) => {
            request.resourceTiming ??= timing;
        });
    });
}

function clearResourceTimingsSafely(): void {
    if (typeof performance.clearResourceTimings !== 'function') return;
    // The standby player may already be loading the next track. Preserve its entries
    // before clearing the shared browser buffer.
    preserveActiveResourceTimings();
    performance.clearResourceTimings();
}

function configureResourceTimingBuffer(): void {
    try {
        performance.setResourceTimingBufferSize?.(RESOURCE_TIMING_BUFFER_SIZE);
        performance.addEventListener?.('resourcetimingbufferfull', clearResourceTimingsSafely);
    } catch {
        // Resource Timing management is an optimization; measurements still work without it.
    }
}

configureResourceTimingBuffer();


const formatBytes = (bytes: number | undefined): string | undefined => {
    if (!bytes || !Number.isFinite(bytes)) return undefined;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
    return `${Math.round(bytes / 1024)} КБ`;
};

export function completePlaybackMeasurement(trackId: string | undefined): void {
    if (!trackId) return;
    const measurement = measurements.get(trackId);
    if (!measurement || measurement.completedResult) return;

    const finishedAt = performance.now();
    measurement.stages.set('playbackStarted', finishedAt);
    const request = findTrackUrlTiming(measurement);
    const mediaRequests = findMediaTimings(measurement);
    const serverTimings = new Map((request?.serverTiming ?? []).map(timing => [timing.name, timing.duration]));
    const streamInitializedAt = measurement.stages.get('streamInitialized');
    const sourceAttachedAt = measurement.stages.get('sourceAttached');
    const metrics: PlaybackTimingMetric[] = [];
    const telemetryStages: Partial<Record<PlaybackTelemetryStage, number>> = {};
    const addMetric = (
        label: string,
        duration: number | undefined,
        detail?: string,
        telemetryStage?: PlaybackTelemetryStage
    ) => {
        if (duration !== undefined && Number.isFinite(duration) && duration >= 0) {
            const durationMs = round(duration);
            metrics.push({ label, durationMs, detail });
            if (telemetryStage) telemetryStages[telemetryStage] = durationMs;
        }
    };
    const addStageDelta = (label: string, end: string, start: string, telemetryStage?: PlaybackTelemetryStage) => {
        const endAt = measurement.stages.get(end);
        const startAt = measurement.stages.get(start);
        addMetric(label, endAt !== undefined && startAt !== undefined ? endAt - startAt : undefined, undefined, telemetryStage);
    };

    addMetric('Получение источника', request?.duration, undefined, 'source');
    addMetric('PO-токен', serverTimings.get('po-token'), undefined, 'po_token');
    addMetric('YouTube player API', serverTimings.get('player-info'), undefined, 'player_api');
    addMetric('Построение DASH', serverTimings.get('dash-manifest'), undefined, 'dash_manifest');
    addMetric(
        'DASH до инициализации',
        streamInitializedAt !== undefined && sourceAttachedAt !== undefined
            ? streamInitializedAt - sourceAttachedAt
            : undefined,
        undefined,
        'dash_initialization'
    );
    addStageDelta('Ожидание Shaka/MSE', 'shakaLoadStarted', 'sourceAttached');
    addStageDelta('Shaka load → streaming', 'shakaStreaming', 'shakaLoadStarted');
    addStageDelta('Shaka streaming → готова', 'streamInitialized', 'shakaStreaming');
    addStageDelta('Загрузка и разбор MPD', 'manifestLoaded', 'sourceAttached', 'mpd');
    addStageDelta('MPD готов → запрос index', 'indexRequestStarted', 'manifestLoaded', 'index_wait');
    addStageDelta('Загрузка index', 'indexRequestCompleted', 'indexRequestStarted', 'index_download');
    addStageDelta('Index → запрос init', 'initRequestStarted', 'indexRequestCompleted', 'init_wait');
    addStageDelta('Загрузка init-фрагмента', 'initRequestCompleted', 'initRequestStarted', 'init_download');
    addMetric(
        'После инициализации до звука',
        streamInitializedAt !== undefined ? finishedAt - streamInitializedAt : undefined,
        undefined,
        'after_initialization'
    );
    addStageDelta('Init → первый медиасегмент', 'mediaRequestStarted', 'initRequestCompleted', 'first_media_wait');
    addStageDelta('Загрузка первого медиасегмента', 'mediaRequestCompleted', 'mediaRequestStarted', 'first_media_download');
    addStageDelta('Медиасегмент → данные в буфере', 'segmentAppended', 'mediaRequestCompleted', 'media_append');
    (['index', 'init', 'media'] as const).forEach(kind => {
        const stageKind = kind[0].toUpperCase() + kind.slice(1);
        const label = kind === 'media' ? 'первый media' : kind;
        const networkStage: PlaybackTelemetryStage = kind === 'media' ? 'first_media_network' : `${kind}_network`;
        addStageDelta(`SABR ${label}: сеть`, `sabr${stageKind}Response`, `sabr${stageKind}Request`, networkStage);
        addStageDelta(`SABR ${label}: обработка UMP`, `sabr${stageKind}Processed`, `sabr${stageKind}Response`);
        addStageDelta(`SABR ${label}: передача в Shaka`, `sabr${stageKind}Delivered`, `sabr${stageKind}Processed`);
    });
    addStageDelta('Init → loadedmetadata', 'nativeLoadedMetadata', 'initRequestCompleted', 'loaded_metadata');
    addStageDelta('Буфер → canplay', 'nativeCanPlay', 'segmentAppended', 'can_play');
    addStageDelta('Буфер → звук', 'playbackStarted', 'segmentAppended', 'buffer_to_audio');
    const firstRequestByKind = new Map<MediaRequestKind, MatchedMediaTiming>();
    mediaRequests.forEach(mediaRequest => {
        const previous = firstRequestByKind.get(mediaRequest.request.kind);
        if (!previous || (!previous.timing && mediaRequest.timing)) {
            firstRequestByKind.set(mediaRequest.request.kind, mediaRequest);
        }
    });
    Array.from(firstRequestByKind.values()).forEach(({ request: recorded, timing: mediaRequest }) => {
        if (!mediaRequest) return;
        const serverTiming = new Map(
            (mediaRequest.serverTiming ?? []).map(timing => [timing.name, timing.duration])
        );
        const kind = recorded.kind === 'index' ? 'Index'
            : recorded.kind === 'init' ? 'Init'
                : 'Первый media';
        const bodyBytes = serverTiming.get('upstream-bytes') || mediaRequest.encodedBodySize;
        const rangeStart = serverTiming.get('range-start');
        const rangeEnd = serverTiming.get('range-end');
        const hedgeLaunched = serverTiming.get('sabr-hedge-launched');
        const hedgeWon = serverTiming.get('sabr-hedge-winner') === 1;
        const hedgeWinnerMs = serverTiming.get('sabr-hedge-winner-ms');
        const hedgeLoserMs = serverTiming.get('sabr-hedge-loser-ms');
        const hedgeLoserAborted = serverTiming.get('sabr-hedge-loser-aborted') === 1;
        const requestBodyMs = serverTiming.get('sabr-request-body-ms');
        const upstreamHeadersMs = serverTiming.get('sabr-upstream-headers-ms');
        const upstreamFirstByteMs = serverTiming.get('sabr-upstream-first-byte-ms');
        const downstreamFirstWriteMs = serverTiming.get('sabr-downstream-first-write-ms');
        const telemetryKind = recorded.kind === 'media' ? 'first_media' : recorded.kind;
        if (upstreamHeadersMs !== undefined) {
            telemetryStages[`${telemetryKind}_upstream_headers` as PlaybackTelemetryStage] = round(upstreamHeadersMs);
        }
        if (upstreamFirstByteMs !== undefined) {
            telemetryStages[`${telemetryKind}_upstream_first_byte` as PlaybackTelemetryStage] = round(upstreamFirstByteMs);
        }
        if (downstreamFirstWriteMs !== undefined) {
            telemetryStages[`${telemetryKind}_downstream_first_write` as PlaybackTelemetryStage] = round(downstreamFirstWriteMs);
        }
        const hedgeDetail = hedgeLaunched === undefined ? undefined
            : hedgeLaunched === 0
                ? `Страховка: дубль не запускался · основной ${Math.round(hedgeWinnerMs ?? 0)} мс`
                : `Страховка: победил ${hedgeWon ? 'дубль' : 'основной'} за ${Math.round(hedgeWinnerMs ?? 0)} мс`
                    + (hedgeLoserMs === undefined ? ''
                        : ` · ${hedgeWon ? 'основной' : 'дубль'} ${hedgeLoserAborted ? 'отменён' : 'завершился'} через ${Math.round(hedgeLoserMs)} мс`);
        const details = [
            `TTFB ${Math.round(mediaRequest.responseStart - mediaRequest.startTime)} мс`,
            `тело ${Math.round(mediaRequest.responseEnd - mediaRequest.responseStart)} мс`,
            formatBytes(bodyBytes),
            rangeStart !== undefined && rangeEnd !== undefined
                ? `Range ${rangeStart}-${rangeEnd}`
                : recorded.range ? `Range ${recorded.range}` : undefined,
            serverTiming.has('googlevideo-headers')
                ? `CDN ${Math.round(serverTiming.get('googlevideo-headers')!)} мс`
                : undefined,
            requestBodyMs !== undefined ? `сервер: запрос ${Math.round(requestBodyMs)} мс` : undefined,
            upstreamHeadersMs !== undefined ? `upstream headers ${Math.round(upstreamHeadersMs)} мс` : undefined,
            upstreamFirstByteMs !== undefined ? `upstream byte ${Math.round(upstreamFirstByteMs)} мс` : undefined,
            downstreamFirstWriteMs !== undefined ? `write ${Math.round(downstreamFirstWriteMs)} мс` : undefined,
            recorded.responseHash && recorded.prefixHash
                ? `FNV ${recorded.responseHash}/${recorded.prefixHash}`
                : undefined,
            recorded.mediaEndBytes !== undefined
                ? `MediaEnd ≤ ${formatBytes(recorded.mediaEndBytes)}`
                : undefined,
            recorded.coalescingStatus
                ? `Coalescing ${recorded.coalescingStatus}`
                    + (recorded.networkRange ? ` ${recorded.networkRange}` : '')
                    + (recorded.expectedBytes !== undefined || recorded.actualBytes !== undefined
                        ? ` (${recorded.actualBytes ?? '?'} / ${recorded.expectedBytes ?? '?'} B)`
                        : '')
                : undefined,
            hedgeDetail
        ].filter(Boolean).join(' · ');
        addMetric(`${kind} HTTP`, mediaRequest.duration, details);
    });
    (Object.entries(measurement.sabrProxyDiagnostics) as [MediaRequestKind, SabrProxyDiagnosticMeasurement][])
        .forEach(([kind, diagnostic]) => metrics.push(sabrProxyDiagnosticMetric(kind, diagnostic)));

    const totalMs = round(finishedAt - measurement.startedAt);
    reportPlaybackTelemetry(totalMs, telemetryStages);
    measurement.completedResult = {
        trackId,
        title: measurement.title || trackId,
        totalMs,
        metrics
    };
    window.dispatchEvent(new CustomEvent<PlaybackTimingResult>(PLAYBACK_TIMING_EVENT, {
        detail: measurement.completedResult
    }));
    clearResourceTimingsSafely();
}
