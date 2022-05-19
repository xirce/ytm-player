import { Router } from 'express';
import { ytmusic } from "../server";
import { mapToAlbumBase, mapToArtistBase, mapToPlaylistBase, mapToTrack } from "../mappings/ytmusic-api";
import { ISearchResponse } from "../shared";
import { AlbumDetailed, ArtistBasic, PlaylistFull, SongDetailed } from "ytmusic-api";

const router = Router();

async function searchAll(query: string): Promise<ISearchResponse> {
    const searchAll = await ytmusic.search(query as string);

    const songs: SongDetailed[] = [];
    const artists: ArtistBasic[] = [];
    const albums: AlbumDetailed[] = [];
    const playlists: PlaylistFull[] = [];

    searchAll.forEach(item => {
        switch (item.type) {
            case 'SONG':
                songs.push(item);
                break;
            case 'PLAYLIST':
                playlists.push(item);
                break;
            case 'ALBUM':
                albums.push(item);
                break;
            case 'ARTIST':
                artists.push(item);
        }
    });

    return {
        artists: artists.map(mapToArtistBase),
        tracks: songs.map(mapToTrack),
        albums: albums.map(mapToAlbumBase),
        playlists: playlists.map(mapToPlaylistBase)
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

router.get('/suggestions', async (req, res) => {
    const query = req.query.q;
    const searchSuggestions = await ytmusic.getSearchSuggestions(query as string);
    res.json(searchSuggestions);
});

export default router;