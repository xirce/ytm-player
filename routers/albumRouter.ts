import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { getThumbnailUrl, getThumbnailUrls, mapToTrack } from '../mappings/ytmusic-api';
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
    const imageUrls = getThumbnailUrls(thumbnail);
    const firstTrack = albumInfo.contents[0];
    const firstArtist = firstTrack
        ? mapToTrack(firstTrack).artist
        : { id: null, name: '' };
    const headerAuthor = header && 'author' in header ? header.author : undefined;
    const headerArtistTexts = header
        ? ['strapline_text_one', 'subtitle', 'second_subtitle']
            .map(key => key in header ? header[key as keyof typeof header] : undefined)
            .filter((value): value is NonNullable<typeof value> => Boolean(value))
        : [];
    const subtitleArtist = headerArtistTexts.flatMap(value =>
        typeof value === 'object' && value && 'runs' in value
            ? value.runs ?? []
            : []
    ).flatMap(run => {
        if (!('endpoint' in run)) {
            return [];
        }
        const browseId = run.endpoint?.payload?.browseId ?? run.endpoint?.payload?.browse_id;
        const name = run.text.trim();
        return typeof browseId === 'string' && browseId.startsWith('UC') && name
            ? [{ id: browseId, name }]
            : [];
    })[0];
    const plainHeaderArtist = headerArtistTexts
        .map(value => String(value).trim())
        .find(value => value
            && !/^(?:album|single|ep|альбом|сингл)$/i.test(value)
            && !/^(?:19|20)\d{2}$/.test(value)
            && !/^\d+\s*(?:songs?|tracks?|пес(?:ен|ни)|трек)/i.test(value)
            && !/^\d+:\d+(?::\d+)?$/.test(value));
    const headerArtist = headerAuthor?.name?.trim()
        ? { id: headerAuthor.channel_id ?? null, name: headerAuthor.name.trim() }
        : undefined;
    const artist = headerArtist
        ?? subtitleArtist
        ?? (firstArtist.name?.trim() ? firstArtist : undefined)
        ?? { id: null, name: plainHeaderArtist ?? '' };
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
                imageUrl,
                imageUrls
            }))
    };
    res.json(album);
}));

export default router;
