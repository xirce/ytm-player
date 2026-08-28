import app from './app';
import ytmusic from './utils/YTMusicApiWrapper';
import session from './utils/session';

const PORT = process.env.PORT || 3001;

async function start() {
    try {
        await Promise.all([ytmusic.initialize(), session.fetch()]);
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Server error', error);
        process.exit(1);
    }
}

start();
