import { Router } from 'express';
import { randomUUID } from 'crypto';
import { YTMusic, YTNodes } from 'youtubei.js';
import { mapToHomeSection } from '../mappings/ytmusic-api';
import { IHomeFeed, IHomeSection, IHomeSectionPage } from '../shared';
import { asyncHandler, HttpError } from '../middleware/errors';
import { requireUser } from '../middleware/appAuth';
import { PersonalMusicClient, personalMusicClients } from '../utils/personalMusicClient';

const router = Router();
type HomeFeed = YTMusic.HomeFeed;
const CURSOR_TTL_MS = 5 * 60 * 1000;
const continuations = new Map<string, { userId: string; feed: HomeFeed; expiresAt: number }>();
type SectionRequest = Parameters<PersonalMusicClient['getHomeSectionPage']>[0];
const sectionCursors = new Map<string, { userId: string; request: SectionRequest; expiresAt: number }>();

const storeSectionCursor = (userId: string, request: SectionRequest): string => {
    const now = Date.now();
    sectionCursors.forEach((value, key) => {
        if (value.expiresAt <= now) sectionCursors.delete(key);
    });
    const cursor = randomUUID();
    sectionCursors.set(cursor, { userId, request, expiresAt: now + 30 * 60 * 1000 });
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

const mapSections = (userId: string, home: HomeFeed): IHomeSection[] => Array.from(home.sections ?? [])
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
                ? storeSectionCursor(userId, { browseId, ...(typeof params === 'string' ? { params } : {}) }) : null
        };
    })
    .filter((section): section is IHomeSection => Boolean(section));

const storeContinuation = (userId: string, feed: HomeFeed): string | null => {
    const now = Date.now();
    continuations.forEach((value, key) => {
        if (value.expiresAt <= now) continuations.delete(key);
    });
    if (!feed.has_continuation) return null;

    const cursor = randomUUID();
    continuations.set(cursor, { userId, feed, expiresAt: now + CURSOR_TTL_MS });
    return cursor;
};

router.use(requireUser);

router.get('/', asyncHandler(async (req, res) => {
    const client = await personalMusicClients.get(req.user!.id);
    const home = await client.getHomeFeed();
    const response: IHomeFeed = {
        sections: putQuickPicksFirst(mapSections(req.user!.id, home)),
        continuation: storeContinuation(req.user!.id, home)
    };
    res.setHeader('Cache-Control', 'no-store');
    res.json(response);
}));

router.get('/section', asyncHandler(async (req, res) => {
    const client = await personalMusicClients.get(req.user!.id);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
    const stored = sectionCursors.get(cursor);
    if (!stored || stored.userId !== req.user!.id || stored.expiresAt <= Date.now()) {
        if (stored?.expiresAt && stored.expiresAt <= Date.now()) sectionCursors.delete(cursor);
        throw new HttpError(410, 'Section continuation has expired; refresh the home page');
    }
    // Keep the cursor valid on failure so a transient upstream error can be retried.
    const page = await client.getHomeSectionPage(stored.request);
    const response: IHomeSectionPage = {
        items: page.items,
        continuation: page.continuation && page.continuation !== stored.request.continuation
            ? storeSectionCursor(req.user!.id, { continuation: page.continuation }) : null
    };
    res.setHeader('Cache-Control', 'no-store');
    res.json(response);
}));

router.get('/continuation', asyncHandler(async (req, res) => {
    await personalMusicClients.get(req.user!.id);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
    const stored = continuations.get(cursor);
    if (!stored || stored.userId !== req.user!.id || stored.expiresAt <= Date.now()) {
        if (stored?.expiresAt && stored.expiresAt <= Date.now()) continuations.delete(cursor);
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
        sections: mapSections(req.user!.id, home),
        continuation: storeContinuation(req.user!.id, home)
    };
    res.setHeader('Cache-Control', 'no-store');
    res.json(response);
}));

export default router;
