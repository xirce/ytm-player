import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { mapToTrack } from '../mappings/ytmusic-api';
import { IAlbum } from '../shared';
import { asyncHandler } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

const router = Router();

router.get('/:id', asyncHandler(async (req, res) => {
    const id = getRequiredParam(req, 'id');
    const albumInfo = await ytmusic.getAlbum(id);
    const header = albumInfo.header;
    const album: IAlbum = {
        info: {
            id,
            name: header?.title.toString() ?? '',
            artist: {
                id: header && 'author' in header ? header.author?.channel_id ?? null : null,
                name: header && 'author' in header ? header.author?.name ?? '' : ''
            },
            imageUrl: header && 'thumbnails' in header
                ? header.thumbnails.at(-1)?.url ?? ''
                : header?.thumbnail?.contents.at(-1)?.url ?? '',
            year: header && 'year' in header ? Number.parseInt(header.year) || null : null,
            radioId: `RDAMPL${id}`
        },
        tracks: albumInfo.contents.map(mapToTrack)
    };
    res.json(album);
}));

export default router;
