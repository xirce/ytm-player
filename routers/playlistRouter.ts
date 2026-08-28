import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { asyncHandler } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

const router = Router();

router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await ytmusic.getPlaylistWithVideos(getRequiredParam(req, 'id')));
}));

export default router;
