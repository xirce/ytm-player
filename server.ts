import app from './app';
import ytmusic from './utils/YTMusicApiWrapper';
import session from './utils/session';
import { database } from './utils/database';

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
        await Promise.all([ytmusic.initialize(), session.fetch(), database.initialize()]);
        app.listen(Number(PORT), HOST, () => {
            console.log(`Server running at http://${HOST}:${PORT}`);
        });
    } catch (error) {
        console.error('Server error', error);
        process.exit(1);
    }
}

start();
