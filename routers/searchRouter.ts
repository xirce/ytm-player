import { Router } from 'express';
import ytmusic from "../utils/YTMusicApiWrapper";
import { mapToAlbumInfo, mapToArtistInfoListItem, mapToPlaylistInfo, mapToTrack } from "../mappings/ytmusic-api";
import { ISearchResponse } from "../shared";
import { MusicResponsiveListItem } from 'youtubei.js/dist/src/parser/nodes';

const router = Router();

async function searchAll(query: string): Promise<ISearchResponse> {
    const searchResult = await ytmusic.search(query as string);

    return {
        artists: searchResult.artists?.contents.map(mapToArtistInfoListItem) ?? [],
        tracks: searchResult.songs?.contents.map(mapToTrack) ?? [],
        albums: searchResult.albums?.contents.map(mapToAlbumInfo) ?? [],
        playlists: searchResult.playlists?.contents.map(mapToPlaylistInfo) ?? []
    };
}

router.get('', async (req, res) => {
    try {
        const query = req.query.q;
        const searchResults = await searchAll(query as string);
        res.json(searchResults);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

router.get('/artists', async (req, res) => {
    try {
        const query = req.query.q;
        const artists = await ytmusic.searchArtists(query as string);
        const mappedArtists = artists.map(mapToArtistInfo);
        res.json(mappedArtists);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

router.get('/tracks', async (req, res) => {
    try {
        const query = req.query.q;
        const songs = await ytmusic.searchSongs(query as string);
        const tracks = songs.map(mapToTrack);
        res.json(tracks);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

router.get('/albums', async (req, res) => {
    try {
        const query = req.query.q;
        const albums = await ytmusic.searchAlbums(query as string);
        const mappedAlbums = albums.map(mapToAlbumInfo);
        res.json(mappedAlbums);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

router.get('/playlists', async (req, res) => {
    try {
        const query = req.query.q;
        const playlists = await ytmusic.searchPlaylists(query as string);
        const mappedPlaylists = playlists.map(mapToPlaylistInfo);
        res.json(mappedPlaylists);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

router.get('/suggestions', async (req, res) => {
    try {
        const query = req.query.q;
        const searchSuggestions = await ytmusic.getSearchSuggestions(query as string);
        res.json(searchSuggestions);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

export default router;