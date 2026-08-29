import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { asyncHandler, HttpError } from '../middleware/errors';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
    if (ytmusic.getAuthenticationState().status !== 'authenticated') {
        throw new HttpError(401, 'YouTube authentication is required');
    }
    if (!ytmusic.hasPersonalizedMusicAccess()) {
        throw new HttpError(503, 'YouTube Music cookie authentication is required');
    }

    const tracks = await ytmusic.getMusicHistory();
    res.setHeader('Cache-Control', 'no-store');
    res.json(tracks);
}));

export default router;
