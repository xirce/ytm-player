import app from './app';
import ytmusic from './utils/YTMusicApiWrapper';
import { database } from './utils/database';
import { validateProductionConfig } from './utils/config';
import type { Server } from 'node:http';

try {
    const loadEnvFile = (process as typeof process & { loadEnvFile?: () => void }).loadEnvFile;
    loadEnvFile?.();
} catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST?.trim() || '0.0.0.0';

async function start() {
    try {
        validateProductionConfig();
        await Promise.all([ytmusic.initialize(), database.initialize()]);
        const server = app.listen(Number(PORT), HOST, () => {
            console.log(`Server running at http://${HOST}:${PORT}`);
        });
        installShutdownHandlers(server);
    } catch (error) {
        console.error('Server error', error);
        process.exit(1);
    }
}

const installShutdownHandlers = (server: Server): void => {
    let stopping = false;
    const shutdown = (signal: NodeJS.Signals) => {
        if (stopping) return;
        stopping = true;
        console.log(`Received ${signal}; shutting down`);
        const forceExit = setTimeout(() => process.exit(1), 10_000);
        forceExit.unref();
        server.close(async error => {
            try {
                await database.close();
            } catch (closeError) {
                console.error('Database shutdown error', closeError);
                process.exitCode = 1;
            }
            if (error) {
                console.error('HTTP shutdown error', error);
                process.exitCode = 1;
            }
            clearTimeout(forceExit);
            process.exit();
        });
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
};

start();
