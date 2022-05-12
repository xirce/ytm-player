import express from 'express';
import YTMusic from 'ytmusic-api';
import cors from 'cors';
// @ts-ignore
import ytcog from 'ytcog';
import { measure } from './utils';

const app = express();
const ytmusic = new YTMusic();
const session = new ytcog.Session();

const trackUrls = new Map<string, string>();

function mapSongToTrack(song: any) {
    return {
        id: song.videoId,
        title: song.name,
        artist: song.artists[0]?.name,
        imageUrl: song.thumbnails[0].url,
        duration: song.duration
    }
}

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

    const songs = sorted.songs.map(mapSongToTrack);

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

async function fetchTrackUrl(id: string): Promise<string> {
    const video = new ytcog.Video(session, { id: id });
    await video.fetch();
    const info = video.info();
    return info.audioStreams[0].url;
}

async function getTrackUrl(id: string) {
    let trackUrl = trackUrls.get(id);

    if (trackUrl) {
        const expireTime = new URLSearchParams(trackUrl).get('expire');
        if (Date.parse(expireTime as string) >= Date.now()) {
            trackUrl = await fetchTrackUrl(id);
            trackUrls.set(id, trackUrl);
        }
    } else {
        trackUrl = await fetchTrackUrl(id);
        trackUrls.set(id, trackUrl);
    }

    return trackUrl;
}

app.use(express.json());
app.use(cors());

app.get('/api/search_suggestions', async (req, res) => {
    const query = req.query.q;
    const searchSuggestions = await ytmusic.getSearchSuggestions(query as string);
    res.json(searchSuggestions);
});

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const searchResults = await measure(searchAll)(query);
        res.json(searchResults);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

app.get('/api/track_url/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let trackUrl = trackUrls.get(id);
        if (!trackUrl) {
            trackUrl = await measure(getTrackUrl)(id);
            trackUrls.set(id, trackUrl as string);
        }
        res.json(trackUrl);

    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

app.get('/api/playlist/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const playlist = await ytmusic.getPlaylist(id);
        const videos = await ytmusic.getPlaylistVideos(id);
        const tracks = videos.map(mapSongToTrack);
        res.json([playlist, tracks]);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

const PORT = process.env.PORT || 3001;

async function start() {
    try {
        await ytmusic.initialize();
        await session.fetch();
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.log('Server error', (error as Error).message);
        process.exit(1);
    }
}

start();