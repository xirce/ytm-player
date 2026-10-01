import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';
import { mapToAlbumInfo, mapToArtistInfoListItem, mapToPlaylistInfo, mapToTrack } from '../mappings/ytmusic-api';
import { asyncHandler } from '../middleware/errors';
import { getRequiredQuery } from '../middleware/validation';

const router = Router();

router.get('', asyncHandler(async (req, res) => {
    const result = await ytmusic.search(getRequiredQuery(req, 'q'));
    res.json({
        artists: result.artists.map(mapToArtistInfoListItem),
        tracks: result.songs.map(item => mapToTrack(item)),
        albums: result.albums.map(item => mapToAlbumInfo(item)),
        playlists: result.playlists.map(mapToPlaylistInfo)
    });
}));

router.get('/artists', asyncHandler(async (req, res) => {
    const artists = await ytmusic.searchArtists(getRequiredQuery(req, 'q'));
    res.json(artists.map(mapToArtistInfoListItem));
}));

router.get('/tracks', asyncHandler(async (req, res) => {
    const tracks = await ytmusic.searchSongs(getRequiredQuery(req, 'q'));
    res.json(tracks.map(item => mapToTrack(item)));
}));

router.get('/albums', asyncHandler(async (req, res) => {
    const albums = await ytmusic.searchAlbums(getRequiredQuery(req, 'q'));
    res.json(albums.map(item => mapToAlbumInfo(item)));
}));

router.get('/playlists', asyncHandler(async (req, res) => {
    const playlists = await ytmusic.searchPlaylists(getRequiredQuery(req, 'q'));
    res.json(playlists.map(mapToPlaylistInfo));
}));

router.get('/suggestions', asyncHandler(async (req, res) => {
    res.json(await ytmusic.getSearchSuggestions(getRequiredQuery(req, 'q')));
}));

export default router;
