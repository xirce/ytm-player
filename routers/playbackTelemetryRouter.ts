import { Router } from 'express';
import { PLAYBACK_STAGE_NAMES, PlaybackStageName, recordPlaybackTelemetry } from '../utils/metrics';

const router = Router();
const stageNames = new Set<string>(PLAYBACK_STAGE_NAMES);
const maximumDurationMs = 120_000;

function isDuration(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximumDurationMs;
}

router.post('/', (req, res) => {
    const body = req.body as { totalMs?: unknown; stages?: unknown };
    if (!body || !isDuration(body.totalMs) || !body.stages || typeof body.stages !== 'object' || Array.isArray(body.stages)) {
        res.status(400).json({ error: 'Invalid playback telemetry' });
        return;
    }

    const stages: Partial<Record<PlaybackStageName, number>> = {};
    for (const [stage, duration] of Object.entries(body.stages)) {
        if (!stageNames.has(stage) || !isDuration(duration)) {
            res.status(400).json({ error: 'Invalid playback telemetry stage' });
            return;
        }
        stages[stage as PlaybackStageName] = duration;
    }

    recordPlaybackTelemetry(body.totalMs, stages);
    res.sendStatus(204);
});

export default router;
