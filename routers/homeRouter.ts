import { Router } from 'express';
import { randomUUID } from 'crypto';
import { YTNodes } from 'youtubei.js';
import ytmusic from '../utils/YTMusicApiWrapper';
import { mapToHomeSection } from '../mappings/ytmusic-api';
import { IHomeFeed, IHomeSection, IHomeSectionPage } from '../shared';
import { asyncHandler, HttpError } from '../middleware/errors';

const router = Router();
type HomeFeed = Awaited<ReturnType<typeof ytmusic.getHomeFeed>>;
const CURSOR_TTL_MS = 5 * 60 * 1000;
const continuations = new Map<string, { feed: HomeFeed; expiresAt: number }>();
type SectionRequest = Parameters<typeof ytmusic.getHomeSectionPage>[0];
const sectionCursors = new Map<string, { request: SectionRequest; expiresAt: number }>();

const storeSectionCursor = (request: SectionRequest): string => {
    const now = Date.now();
    sectionCursors.forEach((value, key) => {
        if (value.expiresAt <= now) sectionCursors.delete(key);
    });
    const cursor = randomUUID();
    sectionCursors.set(cursor, { request, expiresAt: now + 30 * 60 * 1000 });
    return cursor;
};

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
    .map((source): IHomeSection | undefined => {
        const section = mapToHomeSection(source);
        if (!section) return undefined;
        const endpoint = source.header?.more_content?.endpoint ?? source.header?.title.endpoint;
        const { browseId, params } = endpoint?.payload ?? {};
        return {
            ...section,
            continuation: typeof browseId === 'string'
                ? storeSectionCursor({ browseId, ...(typeof params === 'string' ? { params } : {}) }) : null
        };
    })
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

router.get('/section', asyncHandler(async (req, res) => {
    requirePersonalizedAccess();
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
    const stored = sectionCursors.get(cursor);
    if (!stored || stored.expiresAt <= Date.now()) {
        sectionCursors.delete(cursor);
        throw new HttpError(410, 'Section continuation has expired; refresh the home page');
    }
    // Keep the cursor valid on failure so a transient upstream error can be retried.
    const page = await ytmusic.getHomeSectionPage(stored.request);
    const response: IHomeSectionPage = {
        items: page.items,
        continuation: page.continuation && page.continuation !== stored.request.continuation
            ? storeSectionCursor({ continuation: page.continuation }) : null
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
