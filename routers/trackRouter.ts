import { Router } from 'express';
import { Readable } from 'node:stream';
import ytmusic from '../utils/YTMusicApiWrapper';
import { asyncHandler, HttpError } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

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

router.get('/proxy', asyncHandler(async (req, res) => {
    if (typeof req.query.url !== 'string') {
        throw new HttpError(400, 'Query parameter "url" is required');
    }

    let mediaUrl: URL;
    try {
        mediaUrl = new URL(req.query.url);
    } catch {
        throw new HttpError(400, 'Invalid media URL');
    }
    if (!isAllowedMediaUrl(mediaUrl)) {
        throw new HttpError(403, 'Media URL is not allowed');
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

    Readable.from(upstream.body as AsyncIterable<Uint8Array>)
        .on('error', error => {
            console.error('Track proxy stream error', error);
            res.destroy(error as Error);
        })
        .pipe(res);
}));

router.get('/:id/url', asyncHandler(async (req, res) => {
    const id = getRequiredParam(req, 'id');
    const proxyBaseUrl = `${req.protocol}://${req.get('host')}`;
    res.json(await fetchTrackUrl(id, proxyBaseUrl));
}));



export default router;
