import { Router } from 'express';
import { randomUUID } from 'crypto';
import { YTNodes } from 'youtubei.js';
import ytmusic from '../utils/YTMusicApiWrapper';
import { mapToHomeSection } from '../mappings/ytmusic-api';
import { IHomeFeed, IHomeSection } from '../shared';
import { asyncHandler, HttpError } from '../middleware/errors';

const router = Router();
type HomeFeed = Awaited<ReturnType<typeof ytmusic.getHomeFeed>>;
const CURSOR_TTL_MS = 5 * 60 * 1000;
const continuations = new Map<string, { feed: HomeFeed; expiresAt: number }>();

const isQuickPicksSection = (section: IHomeSection): boolean =>
    /quick\s*picks|рекомендуем|быстр(?:ый|ые)\s+(?:выбор|подборк)/i.test(section.title);

const putQuickPicksFirst = (sections: IHomeSection[]): IHomeSection[] => {
    const quickPicksIndex = sections.findIndex(isQuickPicksSection);
    if (quickPicksIndex <= 0) return sections;

    return [
        sections[quickPicksIndex],
        ...sections.slice(0, quickPicksIndex),
        ...sections.slice(quickPicksIndex + 1)
    ];
};

const mapSections = (home: HomeFeed): IHomeSection[] => Array.from(home.sections ?? [])
    .filter((section): section is YTNodes.MusicCarouselShelf =>
        section instanceof YTNodes.MusicCarouselShelf
    )
    .map(mapToHomeSection)
    .filter((section): section is IHomeSection => Boolean(section));

const storeContinuation = (feed: HomeFeed): string | null => {
    const now = Date.now();
    continuations.forEach((value, key) => {
        if (value.expiresAt <= now) continuations.delete(key);
    });
    if (!feed.has_continuation) return null;

    const cursor = randomUUID();
    continuations.set(cursor, { feed, expiresAt: now + CURSOR_TTL_MS });
    return cursor;
};

const requirePersonalizedAccess = (): void => {
    if (ytmusic.getAuthenticationState().status !== 'authenticated') {
        throw new HttpError(401, 'YouTube authentication is required');
    }
    if (!ytmusic.hasPersonalizedMusicAccess()) {
        throw new HttpError(503, 'YouTube Music cookie authentication is required');
    }
};

router.get('/', asyncHandler(async (_req, res) => {
    requirePersonalizedAccess();
    const home = await ytmusic.getHomeFeed();
    const response: IHomeFeed = {
        sections: putQuickPicksFirst(mapSections(home)),
        continuation: storeContinuation(home)
    };
    res.setHeader('Cache-Control', 'no-store');
    res.json(response);
}));

router.get('/continuation', asyncHandler(async (req, res) => {
    requirePersonalizedAccess();
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
    const stored = continuations.get(cursor);
    if (!stored || stored.expiresAt <= Date.now()) {
        continuations.delete(cursor);
        throw new HttpError(410, 'Home continuation has expired');
    }

    continuations.delete(cursor);
    let home: HomeFeed;
    try {
        home = await stored.feed.getContinuation();
    } catch {
        // YouTube can advertise a continuation with no content; finish the partial feed cleanly.
        const response: IHomeFeed = { sections: [], continuation: null };
        res.setHeader('Cache-Control', 'no-store');
        res.json(response);
        return;
    }
    const response: IHomeFeed = {
        sections: mapSections(home),
        continuation: storeContinuation(home)
    };
    res.setHeader('Cache-Control', 'no-store');
    res.json(response);
}));

export default router;
