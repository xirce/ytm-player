import express from 'express';
import morgan from 'morgan';
import { existsSync } from 'fs';
import path from 'path';
import trackRouter from './routers/trackRouter';
import searchRouter from './routers/searchRouter';
import playlistRouter from './routers/playlistRouter';
import albumRouter from './routers/albumRouter';
import artistRouter from './routers/artistRouter';
import radioRouter from './routers/radioRouter';
import authRouter from './routers/authRouter';
import homeRouter from './routers/homeRouter';
import historyRouter from './routers/historyRouter';
import playbackTelemetryRouter from './routers/playbackTelemetryRouter';
import youtubeMusicConnectionRouter from './routers/youtubeMusicConnectionRouter';
import { errorHandler } from './middleware/errors';
import { attachUser, requireSameOrigin } from './middleware/appAuth';
import { metricsRegistry } from './utils/metrics';

const app = express();

app.use(express.json());
app.use('/api', attachUser);
app.use('/api', requireSameOrigin);
app.get('/metrics', async (_req, res, next) => {
    try {
        res.setHeader('Content-Type', metricsRegistry.contentType);
        res.send(await metricsRegistry.metrics());
    } catch (error) {
        next(error);
    }
});
app.use(morgan('tiny'));

app.use('/api/tracks', trackRouter);
app.use('/api/search', searchRouter);
app.use('/api/playlists', playlistRouter);
app.use('/api/albums', albumRouter);
app.use('/api/artists', artistRouter);
app.use('/api/radios', radioRouter);
app.use('/api/auth', authRouter);
app.use('/api/youtube-music', youtubeMusicConnectionRouter);
app.use('/api/home', homeRouter);
app.use('/api/history', historyRouter);
app.use('/api/playback-telemetry', playbackTelemetryRouter);

const clientBuildPath = path.resolve(__dirname, 'client', 'build');
const clientIndexPath = path.join(clientBuildPath, 'index.html');

if (existsSync(clientIndexPath)) {
    app.use(express.static(clientBuildPath));
    app.get(/.*/, (req, res, next) => {
        if (req.path === '/api' || req.path.startsWith('/api/')) {
            next();
            return;
        }
        res.sendFile(clientIndexPath);
    });
}

app.use(errorHandler);

export default app;
