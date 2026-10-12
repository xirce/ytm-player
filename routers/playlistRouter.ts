import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { asyncHandler, HttpError } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';
import { personalMusicClients } from '../utils/personalMusicClient';

const router = Router();

const getPersonalClient = async (req: Parameters<typeof getRequiredParam>[0]) => {
    if (!req.user) return null;
    try {
        return await personalMusicClients.get(req.user.id);
    } catch (error) {
        // Public playlists remain available to signed-in users who have not connected YouTube Music.
        if (error instanceof HttpError && error.status === 409) return null;
        throw error;
    }
};

router.get('/:id/continuation', asyncHandler(async (req, res) => {
    const continuation = typeof req.query.continuation === 'string'
        ? req.query.continuation
        : undefined;
    if (!continuation) throw new HttpError(400, 'Missing continuation token');
    const id = getRequiredParam(req, 'id');
    const personalClient = await getPersonalClient(req);
    const page = personalClient
        ? await personalClient.getPlaylistContinuation(continuation)
        : await ytmusic.getPlaylistContinuation(id, continuation);
    if (personalClient) res.setHeader('Cache-Control', 'no-store');
    res.json(page);
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const id = getRequiredParam(req, 'id');
    const browseParams = typeof req.query.params === 'string' ? req.query.params : undefined;
    const personalClient = await getPersonalClient(req);
    const playlist = personalClient
        ? await personalClient.getPlaylistWithVideos(id, browseParams)
        : await ytmusic.getPlaylistWithVideos(id, browseParams);
    if (personalClient) res.setHeader('Cache-Control', 'no-store');
    res.json(playlist);
}));

export default router;
