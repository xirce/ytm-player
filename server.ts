import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import ytmusic from "./utils/YTMusicApiWrapper";
import session from './utils/session';
import trackRouter from "./routers/trackRouter";
import searchRouter from "./routers/searchRouter";
import playlistRouter from "./routers/playlistRouter";
import albumRouter from "./routers/albumRouter";
import artistRouter from "./routers/artistRouter";
import radioRouter from './routers/radioRouter';

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('tiny'))

app.use('/api/tracks', trackRouter);
app.use('/api/search', searchRouter);
app.use('/api/playlists', playlistRouter);
app.use('/api/albums', albumRouter);
app.use('/api/artists', artistRouter);
app.use('/api/radios', radioRouter);


const PORT = process.env.PORT || 3001;

async function start() {
    try {
        await Promise.all([ytmusic.initialize(), session.fetch()]);
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.log('Server error', (error as Error).message);
        process.exit(1)
    }
}

start();
