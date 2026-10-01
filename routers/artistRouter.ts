import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { IArtist } from '../shared';
import { mapToAlbumInfo, mapToArtistInfo, mapToTrack } from '../mappings/ytmusic-api';
import { YTNodes } from 'youtubei.js';
import { asyncHandler } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

const router = Router();

router.get('/:id/tracks', asyncHandler(async (req, res) => {
    res.json(await ytmusic.getArtistTracks(getRequiredParam(req, 'id')));
}));

router.get('/:id/tracks/continuation', asyncHandler(async (req, res) => {
    if (typeof req.query.continuation !== 'string' || !req.query.continuation) {
        throw new Error('Query parameter "continuation" is required');
    }
    res.json(await ytmusic.getArtistTracksContinuation(req.query.continuation));
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const id = getRequiredParam(req, 'id');
    const artistInfo = await ytmusic.getArtist(id);
    const info = mapToArtistInfo(artistInfo, id);
    const songShelf = artistInfo.sections
        .filter((section): section is YTNodes.MusicShelf => section instanceof YTNodes.MusicShelf)
        .find(section => section.contents.some(item => item.item_type === 'song'));
    const topSongs = (songShelf?.contents ?? [])
        .filter(item => item.item_type === 'song' && item.id)
        .map(item => mapToTrack(item, {
            artist: { id, name: info.name },
            imageUrl: info.imageUrl
        }));
    const releaseSections = artistInfo.sections
        .filter((section): section is YTNodes.MusicCarouselShelf =>
            section instanceof YTNodes.MusicCarouselShelf &&
            section.contents.some(item => 'item_type' in item && item.item_type === 'album')
        );
    const singles = releaseSections
        .filter(section => /single|ep/i.test(section.header?.title.toString() ?? ''))
        .flatMap(section => section.contents)
        .filter((item): item is YTNodes.MusicTwoRowItem =>
            item instanceof YTNodes.MusicTwoRowItem && item.item_type === 'album' && Boolean(item.id)
        )
        .map(item => mapToAlbumInfo(item, { id, name: info.name }));
    const albums = releaseSections
        .filter(section => !/single|ep/i.test(section.header?.title.toString() ?? ''))
        .flatMap(section => section.contents)
        .filter((item): item is YTNodes.MusicTwoRowItem =>
            item instanceof YTNodes.MusicTwoRowItem && item.item_type === 'album' && Boolean(item.id)
        )
        .map(item => mapToAlbumInfo(item, { id, name: info.name }));
    const artist: IArtist = {
        info: { ...info, id },
        topSongs,
        tracks: topSongs,
        albums,
        singles
    };
    res.json(artist);
}));

export default router;
