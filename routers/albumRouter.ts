import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { getThumbnailUrl, mapToTrack } from '../mappings/ytmusic-api';
import { IAlbum } from '../shared';
import { asyncHandler } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

const router = Router();

router.get('/:id', asyncHandler(async (req, res) => {
    const id = getRequiredParam(req, 'id');
    const albumInfo = await ytmusic.getAlbum(id);
    const header = albumInfo.header;
    const thumbnail = header && 'thumbnail' in header
        ? header.thumbnail?.contents
        : header && 'thumbnails' in header
            ? header.thumbnails
            : undefined;
    const imageUrl = getThumbnailUrl(thumbnail);
    const firstTrack = albumInfo.contents[0];
    const firstArtist = firstTrack
        ? mapToTrack(firstTrack).artist
        : { id: null, name: '' };
    const headerAuthor = header && 'author' in header ? header.author : undefined;
    const artist = headerAuthor
        ? { id: headerAuthor.channel_id ?? null, name: headerAuthor.name }
        : firstArtist;
    const headerText = header
        ? ['subtitle', 'second_subtitle'].map(key =>
            key in header ? String(header[key as keyof typeof header] ?? '') : ''
        ).join(' ')
        : '';
    const year = header && 'year' in header && header.year
        ? Number.parseInt(header.year, 10) || null
        : Number.parseInt(headerText.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? '', 10) || null;
    const album: IAlbum = {
        info: {
            id,
            name: header?.title.toString() ?? '',
            artist,
            imageUrl,
            year,
            trackCount: albumInfo.contents.filter(track => track.id).length,
            radioId: `RDAMPL${id}`
        },
        tracks: albumInfo.contents
            .filter(track => track.id)
            .map(track => mapToTrack(track, {
                artist,
                album: { id, name: header?.title.toString() ?? '' },
                imageUrl
            }))
    };
    res.json(album);
}));

export default router;
