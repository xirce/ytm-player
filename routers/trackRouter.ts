import { Router } from 'express';
import { Readable } from 'node:stream';
import ytmusic from '../utils/YTMusicApiWrapper';

const router = Router();

function isAllowedMediaUrl(url: URL): boolean {
    return url.protocol === 'https:' &&
        (url.hostname === 'googlevideo.com' || url.hostname.endsWith('.googlevideo.com'));
}

async function fetchTrackUrl(id: string, proxyBaseUrl: string): Promise<string> {
    const dash = await ytmusic.getTrackUrl(id, mediaUrl => {
        const proxyUrl = new URL('/api/tracks/proxy', proxyBaseUrl);
        proxyUrl.searchParams.set('url', mediaUrl.toString());
        return proxyUrl;
    });

    if (!dash)
        throw new Error(`No DASH manifest for track: ${id}`);

    const base64 = Buffer.from(dash, 'utf8').toString('base64');
    return `data:application/dash+xml;charset=utf-8;base64,${base64}`;
}

router.get('/proxy', async (req, res) => {
    try {
        if (typeof req.query.url !== 'string') {
            res.status(400).send('Missing media URL');
            return;
        }

        const mediaUrl = new URL(req.query.url);
        if (!isAllowedMediaUrl(mediaUrl)) {
            res.status(403).send('Media URL is not allowed');
            return;
        }

        const headers = new Headers();
        if (req.headers.range) headers.set('range', req.headers.range);

        const upstream = await fetch(mediaUrl, { headers });
        res.status(upstream.status);

        for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
            const value = upstream.headers.get(header);
            if (value) res.setHeader(header, value);
        }

        if (!upstream.ok || !upstream.body) {
            res.end();
            return;
        }

        Readable.from(upstream.body as AsyncIterable<Uint8Array>).pipe(res);
    } catch (error) {
        console.error('Track proxy error', error);
        if (!res.headersSent) res.sendStatus(502);
        else res.end();
    }
});

router.get('/:id/url', async (req, res) => {
    try {
        const id = req.params.id;
        const proxyBaseUrl = `${req.protocol}://${req.get('host')}`;
        const trackUrl = await fetchTrackUrl(id, proxyBaseUrl);
        res.json(trackUrl);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});



export default router;
