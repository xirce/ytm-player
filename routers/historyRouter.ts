import { Router } from 'express';
import { asyncHandler } from '../middleware/errors';
import { requireUser } from '../middleware/appAuth';
import { personalMusicClients } from '../utils/personalMusicClient';

const router = Router();

router.use(requireUser);

router.get('/', asyncHandler(async (req, res) => {
    const tracks = await (await personalMusicClients.get(req.user!.id)).getMusicHistory();
    res.setHeader('Cache-Control', 'no-store');
    res.json(tracks);
}));

export default router;
