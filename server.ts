import express from 'express';
import YTMusic from 'ytmusic-api';
import cors from 'cors';
import { ITrackBase, IPlaylist, IAlbum } from './shared';
// @ts-ignore
import ytcog from 'ytcog';
import { measure } from './utils';

const app = express();
const ytmusic = new YTMusic();
const session = new ytcog.Session();

async function searchAll(query: string) {
    const searchAll = await ytmusic.search(query as string);

    const sorted = {
        songs: <any>[],
        playlists: <any>[],
        albums: <any>[]
    };

    searchAll.forEach(item => {
        switch (item.type) {
            case 'SONG':
                sorted.songs.push(item);
                break;
            case 'PLAYLIST':
                sorted.playlists.push(item);
                break;
            case 'ALBUM':
                sorted.albums.push(item);
                break;
        }
    });

    const songs = sorted.songs.map((song: any) => {
        return {
            id: song.videoId,
            title: song.name,
            artist: song.artists[0]?.name,
            imageUrl: song.thumbnails[0].url,
            duration: song.duration
        }
    });

    const playlists = sorted.playlists.map((playlist: any) => {
        return {
            id: playlist.playlistId,
            name: playlist.name,
            artist: playlist.artist?.name,
            imageUrl: playlist.thumbnails[0].url,
            tracksCount: playlist.videoCount
        }
    });

    const albums = sorted.albums.map((album: any) => {
        return {
            id: album.albumId,
            name: album.name,
            artist: album.artists[0]?.name,
            imageUrl: album.thumbnails[0].url,
            year: album.year
        }
    });

    return [songs, playlists, albums];
}

async function getTrackUrl(id: string) {
    const video = new ytcog.Video(session, { id: id });
    await video.fetch();
    return video.info();
}

app.use(express.json());
app.use(cors());

app.get('/api/search_suggestions', async (req, res) => {
    const query = req.query.q;
    const searchSuggestions = await ytmusic.getSearchSuggestions(query as string);
    res.json(searchSuggestions);
});

app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    try {
        const searchResults = await measure(searchAll)(query);
        res.json(searchResults);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

<<<<<<< HEAD
app.get('/api/track_url/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const info = await measure(getTrackUrl)(id);
        const url = info.audioStreams[0].url;
        res.json(url);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

app.get('/api/playlist/:id', async (req, res) => {
=======
app.get('/api/getTrackUrl/:id', async (req, res) => {
>>>>>>> 2e348c2e87cdbb915edb247c41480c20d8733ee2
    const id = req.params.id;
    try {
        const playlist = await ytmusic.getPlaylist(id);
        res.json(playlist);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
})
const PORT = process.env.PORT || 3001;

async function start() {
    try {
        await ytmusic.initialize();
        await session.fetch();
    } catch (error) {
        console.log('Server error', (error as Error).message);
        process.exit(1);
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

start();