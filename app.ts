import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
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
import { database } from './utils/database';
import { authorizeMetrics } from './middleware/metricsAuth';

const app = express();

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false
}));
app.use(express.json({ limit: '32kb' }));
app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', async (_req, res) => {
    try {
        await database.ping();
        res.json({ status: 'ready' });
    } catch {
        res.status(503).json({ status: 'unavailable' });
    }
});
app.use('/api', attachUser);
app.use('/api', requireSameOrigin);
app.use('/api/auth/google', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false
}));
app.get('/metrics', authorizeMetrics, async (_req, res, next) => {
    try {
        res.setHeader('Content-Type', metricsRegistry.contentType);
        res.send(await metricsRegistry.metrics());
    } catch (error) {
        next(error);
    }
});
app.use(morgan('tiny', { skip: req => req.path.startsWith('/health/') }));

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

const clientBuildPath = path.resolve(process.cwd(), 'client', 'build');
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
