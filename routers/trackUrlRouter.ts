import { Router } from 'express';
// @ts-ignore
import ytcog from 'ytcog';
import session from '../utils/session';

const router = Router();

const trackUrls = new Map<string, string>();

async function getTrackUrl(id: string) {
    let trackUrl = trackUrls.get(id);

    if (trackUrl) {
        const expireTime = new URLSearchParams(trackUrl).get('expire');
        if (Date.parse(expireTime as string) >= Date.now()) {
            trackUrl = await fetchTrackUrl(id);
            trackUrls.set(id, trackUrl);
        }
    } else {
        trackUrl = await fetchTrackUrl(id);
        trackUrls.set(id, trackUrl);
    }

    return trackUrl;
}

async function fetchTrackUrl(id: string): Promise<string> {
    const video = new ytcog.Video(session, { id: id });
    await video.fetch();
    const info = video.info();
    return info.audioStreams[0].url;
}

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        let trackUrl = trackUrls.get(id);
        if (!trackUrl) {
            trackUrl = await getTrackUrl(id);
            trackUrls.set(id, trackUrl as string);
        }
        res.json(trackUrl);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

export default router;