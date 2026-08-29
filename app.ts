import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import trackRouter from './routers/trackRouter';
import searchRouter from './routers/searchRouter';
import playlistRouter from './routers/playlistRouter';
import albumRouter from './routers/albumRouter';
import artistRouter from './routers/artistRouter';
import radioRouter from './routers/radioRouter';
import authRouter from './routers/authRouter';
import { errorHandler } from './middleware/errors';

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('tiny'));

app.use('/api/tracks', trackRouter);
app.use('/api/search', searchRouter);
app.use('/api/playlists', playlistRouter);
app.use('/api/albums', albumRouter);
app.use('/api/artists', artistRouter);
app.use('/api/radios', radioRouter);
app.use('/api/auth', authRouter);

app.use(errorHandler);

export default app;
