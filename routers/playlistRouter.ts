import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { asyncHandler } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

const router = Router();

router.get('/:id', asyncHandler(async (req, res) => {
    const browseParams = typeof req.query.params === 'string' ? req.query.params : undefined;
    res.json(await ytmusic.getPlaylistWithVideos(getRequiredParam(req, 'id'), browseParams));
}));

export default router;
