import { Router } from 'express';
import { YTNodes } from 'youtubei.js';
import ytmusic from '../utils/YTMusicApiWrapper';
import { mapToHomeSection } from '../mappings/ytmusic-api';
import { IHomeFeed, IHomeSection } from '../shared';
import { asyncHandler, HttpError } from '../middleware/errors';

const router = Router();

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

router.get('/', asyncHandler(async (_req, res) => {
    if (ytmusic.getAuthenticationState().status !== 'authenticated') {
        throw new HttpError(401, 'YouTube authentication is required');
    }
    if (!ytmusic.hasPersonalizedMusicAccess()) {
        throw new HttpError(503, 'YouTube Music cookie authentication is required');
    }

    let home = await ytmusic.getHomeFeed();
    const sections: IHomeSection[] = [];
    const knownSectionTitles = new Set<string>();

    for (let page = 0; page < 5; page += 1) {
        Array.from(home.sections ?? [])
            .filter((section): section is YTNodes.MusicCarouselShelf =>
                section instanceof YTNodes.MusicCarouselShelf
            )
            .map(mapToHomeSection)
            .filter((section): section is IHomeSection => Boolean(section))
            .forEach(section => {
                const key = section.title.trim().toLocaleLowerCase('ru-RU');
                if (knownSectionTitles.has(key)) return;
                knownSectionTitles.add(key);
                sections.push(section);
            });

        if (sections.some(isQuickPicksSection) || !home.has_continuation) break;
        try {
            home = await home.getContinuation();
        } catch {
            // A partial home feed is still more useful than failing the endpoint.
            break;
        }
    }
    const response: IHomeFeed = { sections: putQuickPicksFirst(sections) };
    res.setHeader('Cache-Control', 'no-store');
    res.json(response);
}));

export default router;
