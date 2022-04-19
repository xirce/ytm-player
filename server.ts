import express from 'express';
import YTMusic, { SongDetailed, SearchResult } from 'ytmusic-api';
import cors from 'cors';
import { ITrackBase, IPlaylist, IAlbum } from './shared';
// @ts-ignore
import ytcog from 'ytcog';

const app = express();
const ytmusic = new YTMusic();
const session = new ytcog.Session();

app.use(express.json());
app.use(cors());

app.get('/api/searchSuggestions', async (req, res) => {
    const query = req.query.q;
    const searchSuggestions = await ytmusic.getSearchSuggestions(query as string);
    res.json(searchSuggestions);
});

app.get('/api/searchAll', async (req, res) => {
    const query = req.query.q;
    const searchAll = await ytmusic.search(query as string);

    try {
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

        res.json([songs, playlists, albums]);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }


});

app.get('/api/getTrackUrl/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const startTime = Date.now();

        const video = new ytcog.Video(session, { id: id });
        await video.fetch();
        const info = video.info();
        const endTime = Date.now();
        console.log(`[took ${(endTime - startTime) / 1000}s]`);
        const url = info.audioStreams[0].url;
        res.json(url);
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
    } catch (error) {
        console.log('Server error', (error as Error).message);
        process.exit(1);
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}

start();