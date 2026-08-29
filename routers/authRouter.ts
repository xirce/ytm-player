import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { asyncHandler } from '../middleware/errors';

const router = Router();

router.get('/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(ytmusic.getAuthenticationState());
});

router.post('/device', asyncHandler(async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await ytmusic.startAuthentication());
}));

router.delete('/session', asyncHandler(async (_req, res) => {
    await ytmusic.signOut();
    res.sendStatus(204);
}));

export default router;
