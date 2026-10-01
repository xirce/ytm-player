import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errors';
import { clearSessionCookie, createAppSession, getSessionToken, setSessionCookie } from '../middleware/appAuth';
import { database } from '../utils/database';
import { finishGoogleAuthentication, startGoogleAuthentication } from '../utils/googleAuth';
import { personalMusicClients } from '../utils/personalMusicClient';

const router = Router();

router.get('/status', asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.user) {
        res.json({ status: 'anonymous' });
        return;
    }
    const connection = await database.getMusicConnection(req.user.id);
    res.json({
        status: 'authenticated',
        user: { email: req.user.email, name: req.user.name, pictureUrl: req.user.pictureUrl },
        musicConnection: connection?.status ?? 'not_connected',
        musicRecommendationsAvailable: connection?.status === 'connected'
    });
}));

router.get('/google/start', asyncHandler(async (_req, res) => {
    res.redirect(await startGoogleAuthentication());
}));

router.get('/google/callback', asyncHandler(async (req, res) => {
    if (typeof req.query.error === 'string') throw new HttpError(401, 'Google authentication was cancelled');
    if (typeof req.query.code !== 'string' || typeof req.query.state !== 'string') {
        throw new HttpError(400, 'Invalid Google callback');
    }
    let user;
    try {
        user = await finishGoogleAuthentication(req.query.code, req.query.state);
    } catch {
        throw new HttpError(401, 'Google identity could not be verified');
    }
    const previousToken = getSessionToken(req);
    if (previousToken) await database.deleteSession(previousToken);
    setSessionCookie(res, await createAppSession(user.id));
    res.redirect('/account');
}));

router.post('/logout', asyncHandler(async (req, res) => {
    const token = getSessionToken(req);
    if (token) await database.deleteSession(token);
    if (req.user) personalMusicClients.evict(req.user.id);
    clearSessionCookie(res);
    res.sendStatus(204);
}));

export default router;
