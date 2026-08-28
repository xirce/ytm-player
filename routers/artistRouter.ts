import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { IArtist } from '../shared';
import { mapToArtistInfo } from '../mappings/ytmusic-api';
import { asyncHandler } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

const router = Router();

router.get('/:id', asyncHandler(async (req, res) => {
    const id = getRequiredParam(req, 'id');
    const artistInfo = await ytmusic.getArtist(id);
    const info = mapToArtistInfo(artistInfo);
    const artist: IArtist = {
        info: { ...info, id },
        tracks: [],
        albums: []
    };
    res.json(artist);
}));

export default router;
