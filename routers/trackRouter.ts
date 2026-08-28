import { Router } from 'express';
import { Readable } from 'node:stream';
import ytmusic from '../utils/YTMusicApiWrapper';
import { asyncHandler, HttpError } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

const router = Router();
const mediaRequestNumbers = new Map<string, number>();

function isAllowedMediaUrl(url: URL): boolean {
    return url.protocol === 'https:' &&
        (url.hostname === 'googlevideo.com' || url.hostname.endsWith('.googlevideo.com'));
}

async function logUpstreamError(response: Response, mediaUrl: URL, requestedRange?: string): Promise<void> {
    let body = '';
    try {
        body = (await response.text()).slice(0, 2048);
    } catch (error) {
        body = `<failed to read response body: ${(error as Error).message}>`;
    }

    const responseHeaders = Object.fromEntries(
        ['content-type', 'content-length', 'content-range', 'server', 'date', 'x-restrict-formats-hint']
            .map(name => [name, response.headers.get(name)])
            .filter((entry): entry is [string, string] => entry[1] !== null)
    );

    console.error('YouTube media request failed', {
        status: response.status,
        statusText: response.statusText,
        host: mediaUrl.hostname,
        itag: mediaUrl.searchParams.get('itag'),
        client: mediaUrl.searchParams.get('c'),
        expiresAt: mediaUrl.searchParams.get('expire'),
        contentLength: mediaUrl.searchParams.get('clen'),
        requestedRange,
        upstreamRange: mediaUrl.searchParams.get('range'),
        requestNumber: mediaUrl.searchParams.get('rn'),
        requestedBuffer: mediaUrl.searchParams.get('rbuf'),
        hasPoToken: mediaUrl.searchParams.has('pot'),
        hasNParameter: mediaUrl.searchParams.has('n'),
        responseHeaders,
        body
    });
}

function applyRangeQuery(mediaUrl: URL, range: string): void {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) throw new HttpError(416, 'Unsupported Range header');

    const contentLength = Number(mediaUrl.searchParams.get('clen'));
    const end = match[2] || (Number.isSafeInteger(contentLength) && contentLength > 0
        ? String(contentLength - 1)
        : null);
    if (!end) throw new HttpError(416, 'Cannot determine range end');
    mediaUrl.searchParams.set('range', `${match[1]}-${end}`);
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

    const mediaKey = mediaUrl.toString();
    if (req.headers.range) applyRangeQuery(mediaUrl, req.headers.range);

    const requestNumber = (mediaRequestNumbers.get(mediaKey) ?? 0) + 1;
    mediaRequestNumbers.set(mediaKey, requestNumber);
    mediaUrl.searchParams.set('rn', String(requestNumber));

    const upstream = await fetch(mediaUrl);
    res.status(upstream.status);

    for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(header);
        if (value) res.setHeader(header, value);
    }

    if (!upstream.ok) {
        await logUpstreamError(upstream, mediaUrl, req.headers.range);
        res.end();
        return;
    }

    if (!upstream.body) {
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
