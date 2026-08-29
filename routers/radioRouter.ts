import { Router } from 'express';
import { asyncHandler } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';
import ytmusic from '../utils/YTMusicApiWrapper';

const router = Router();

router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await ytmusic.getRadio(getRequiredParam(req, 'id')));
}));

export default router;
