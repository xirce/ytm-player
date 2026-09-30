import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errors';
import { requireUser } from '../middleware/appAuth';
import { database } from '../utils/database';
import { personalMusicClients } from '../utils/personalMusicClient';

const router = Router();
router.use(requireUser);

router.get('/', asyncHandler(async (req, res) => {
    const connection = await database.getMusicConnection(req.user!.id);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: connection?.status ?? 'not_connected' });
}));

router.put('/', asyncHandler(async (req, res) => {
    if (typeof req.body?.cookie !== 'string') throw new HttpError(400, 'cookie is required');
    await personalMusicClients.connect(req.user!.id, {
        cookie: req.body.cookie,
        authUser: req.body.authUser,
        pageId: req.body.pageId,
        language: req.body.language
    });
    res.json({ status: 'connected' });
}));

router.delete('/', asyncHandler(async (req, res) => {
    await personalMusicClients.disconnect(req.user!.id);
    res.sendStatus(204);
}));

export default router;

