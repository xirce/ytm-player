import express from 'express';
import YTMusic from 'ytmusic-api';
import cors from 'cors';
import { ITrackBase } from './shared';
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

app.get('/api/anotherSearch', async (req, res) => {
    const query = req.query.q;
    const searchRes = await ytmusic.search(query as string);
});

app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const startTime = Date.now();
    const searchResults = await ytmusic.searchSongs(query as string);
    const endTime = Date.now();
    console.log(`[took ${(endTime - startTime) / 1000}s]`);
    try {
        const tracks = searchResults.map<ITrackBase>(song => {
            if (!song.artists) {
                console.log('Without artists', song);
            }
            return {
                id: song.videoId,
                title: song.name,
                artist: song.artists[0]?.name,
                imageUrl: song.thumbnails[0].url,
                duration: song.duration
            }
        });
        res.json(tracks);
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