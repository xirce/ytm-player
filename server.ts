import express, { NextFunction } from 'express';
import YTMusic from 'ytmusic-api';
// @ts-ignore
import ytcog from 'ytcog';
import cors from 'cors';
import trackUrlRouter from "./routers/trackUrlRouter";
import searchRouter from "./routers/searchRouter";
import playlistRouter from "./routers/playlistRouter";
import albumRouter from "./routers/albumRouter";
import artistRouter from "./routers/artistRouter";

const app = express();
const ytmusic = new YTMusic();
const session = new ytcog.Session();

app.use(express.json());
app.use(cors());


app.use('/api/track_urls', trackUrlRouter);
app.use('/api/search', searchRouter);
app.use('/api/playlists', playlistRouter);
app.use('/api/albums', albumRouter);
app.use('/api/artists', artistRouter);

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

export { ytmusic, session };