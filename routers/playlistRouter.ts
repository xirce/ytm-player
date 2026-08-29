import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { asyncHandler, HttpError } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

const router = Router();

router.get('/:id/continuation', asyncHandler(async (req, res) => {
    const continuation = typeof req.query.continuation === 'string'
        ? req.query.continuation
        : undefined;
    if (!continuation) throw new HttpError(400, 'Missing continuation token');
    res.json(await ytmusic.getPlaylistContinuation(getRequiredParam(req, 'id'), continuation));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const browseParams = typeof req.query.params === 'string' ? req.query.params : undefined;
    res.json(await ytmusic.getPlaylistWithVideos(getRequiredParam(req, 'id'), browseParams));
}));

export default router;
