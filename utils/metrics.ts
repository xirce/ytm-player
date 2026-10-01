import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry, prefix: 'ytm_' });

export const PLAYBACK_STAGE_NAMES = [
    'source',
    'po_token',
    'player_api',
    'dash_manifest',
    'dash_initialization',
    'mpd',
    'index_wait',
    'index_download',
    'init_wait',
    'init_download',
    'first_media_wait',
    'first_media_download',
    'media_append',
    'index_network',
    'init_network',
    'first_media_network',
    'index_upstream_headers',
    'init_upstream_headers',
    'first_media_upstream_headers',
    'index_upstream_first_byte',
    'init_upstream_first_byte',
    'first_media_upstream_first_byte',
    'index_downstream_first_write',
    'init_downstream_first_write',
    'first_media_downstream_first_write',
    'loaded_metadata',
    'can_play',
    'buffer_to_audio',
    'after_initialization'
] as const;

export type PlaybackStageName = typeof PLAYBACK_STAGE_NAMES[number];
export type SabrHedgeOutcome = 'not_launched' | 'primary_won' | 'hedge_won' | 'failed';
export type SabrProxyStage = 'upstream_read_complete' | 'downstream_write_complete';

const durationBuckets = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 8, 13, 20];

const playbackStarts = new Counter({
    name: 'ytm_playback_starts_total',
    help: 'Completed playback starts reported by clients.',
    registers: [metricsRegistry]
});

const playbackStartDuration = new Histogram({
    name: 'ytm_playback_start_duration_seconds',
    help: 'Time from playback request until audio starts.',
    buckets: durationBuckets,
    registers: [metricsRegistry]
});

const playbackStageDuration = new Histogram({
    name: 'ytm_playback_stage_duration_seconds',
    help: 'Playback startup stage duration.',
    labelNames: ['stage'] as const,
    buckets: durationBuckets,
    registers: [metricsRegistry]
});

const sabrHedgeRequests = new Counter({
    name: 'ytm_sabr_hedge_requests_total',
    help: 'SABR requests using the server-side hedge strategy.',
    labelNames: ['outcome'] as const,
    registers: [metricsRegistry]
});

const sabrHedgeDuration = new Histogram({
    name: 'ytm_sabr_hedge_duration_seconds',
    help: 'Time until the server-side SABR hedge strategy settles.',
    labelNames: ['outcome'] as const,
    buckets: durationBuckets,
    registers: [metricsRegistry]
});

const sabrProxyStageDuration = new Histogram({
    name: 'ytm_sabr_proxy_stage_duration_seconds',
    help: 'Time from SABR proxy request receipt until a streaming stage completes.',
    labelNames: ['stage'] as const,
    buckets: [...durationBuckets, 30, 60],
    registers: [metricsRegistry]
});

export function recordPlaybackTelemetry(
    totalMs: number,
    stages: Partial<Record<PlaybackStageName, number>>
): void {
    playbackStarts.inc();
    playbackStartDuration.observe(totalMs / 1000);
    for (const [stage, durationMs] of Object.entries(stages)) {
        if (durationMs !== undefined) playbackStageDuration.labels(stage).observe(durationMs / 1000);
    }
}

export function recordSabrHedge(outcome: SabrHedgeOutcome, durationMs: number): void {
    sabrHedgeRequests.labels(outcome).inc();
    sabrHedgeDuration.labels(outcome).observe(durationMs / 1000);
}

export function recordSabrProxyStage(stage: SabrProxyStage, durationMs: number): void {
    sabrProxyStageDuration.labels(stage).observe(durationMs / 1000);
}
