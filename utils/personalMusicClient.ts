import { Innertube, Platform, Types, YTMusic, YTNodes } from 'youtubei.js';
import { IHomeItem, IHomeSectionPage, ITrackBase } from '../shared';
import { mapToHomeItem, mapToTrack } from '../mappings/ytmusic-api';
import { HttpTokenProvider, TokenProvider } from './tokenProvider';
import { database, YouTubeMusicConnectionRecord } from './database';
import { decryptSecret, encryptSecret } from './secretEncryption';
import { HttpError } from '../middleware/errors';

export interface MusicConnectionInput {
    cookie: string;
    authUser?: number;
    pageId?: string;
    language?: string;
}

const validateCookie = (cookie: string): string => {
    const normalized = cookie.trim().replace(/^cookie:\s*/i, '');
    if (!normalized || normalized.length > 16_384) throw new HttpError(400, 'Cookie is missing or too long');
    if (Array.from(normalized).some(character => {
        const code = character.codePointAt(0) ?? 0;
        return code < 0x20 || code > 0x7e;
    })) throw new HttpError(400, 'Cookie contains invalid characters');
    return normalized;
};

export class PersonalMusicClient {
    private constructor(private readonly innertube: Innertube, private readonly tokenProvider: TokenProvider) {}

    public static async create(input: Required<Pick<MusicConnectionInput, 'cookie' | 'authUser' | 'language'>>
        & Pick<MusicConnectionInput, 'pageId'>): Promise<PersonalMusicClient> {
        Platform.shim.eval = async (data: Types.BuildScriptResult) => new Function(data.output)();
        const innertube = await Innertube.create({
            cookie: validateCookie(input.cookie),
            account_index: input.authUser,
            on_behalf_of_user: input.pageId || undefined,
            enable_session_cache: false,
            lang: input.language,
            retrieve_player: false
        });
        return new PersonalMusicClient(
            innertube,
            new HttpTokenProvider(process.env.YOUTUBE_PO_TOKEN_PROVIDER_URL?.trim() || 'http://127.0.0.1:4416')
        );
    }

    public getHomeFeed(): Promise<YTMusic.HomeFeed> {
        return this.innertube.music.getHomeFeed();
    }

    public isAuthenticated(): boolean {
        return this.innertube.session.logged_in;
    }

    public async getHomeSectionPage(request: { browseId?: string; params?: string; continuation?: string }): Promise<IHomeSectionPage> {
        const response = await this.innertube.actions.execute('/browse', { ...request, client: 'YTMUSIC', parse: true });
        const shelf = response.continuation_contents
            ?? response.contents_memo?.getType(YTNodes.Grid)?.[0]
            ?? response.contents_memo?.getType(YTNodes.MusicShelf)?.[0]
            ?? response.contents_memo?.getType(YTNodes.MusicCarouselShelf)?.[0];
        const contents = shelf && 'contents' in shelf ? shelf.contents
            : shelf && 'items' in shelf ? shelf.items : undefined;
        const nodes: unknown[] = Array.isArray(contents) ? contents : response.on_response_received_actions
            ?.filter(action => action instanceof YTNodes.AppendContinuationItemsAction)
            .flatMap(action => action.contents ?? []) ?? [];
        const continuationItem = nodes.find(node => node instanceof YTNodes.ContinuationItem);
        const token = (shelf && 'continuation' in shelf ? shelf.continuation : null)
            ?? (continuationItem instanceof YTNodes.ContinuationItem ? continuationItem.endpoint.payload.token : null);
        return {
            items: nodes.map(mapToHomeItem).filter((item): item is IHomeItem => Boolean(item)),
            continuation: typeof token === 'string' && token ? token : null
        };
    }

    public async getMusicHistory(): Promise<ITrackBase[]> {
        const response = await this.innertube.actions.execute('/browse', {
            browseId: 'FEmusic_history', client: 'YTMUSIC', parse: true
        });
        return (response.contents_memo?.getType(YTNodes.MusicResponsiveListItem) ?? [])
            .filter(item => Boolean(item.id) && (
                item.item_type === 'song'
                || item.item_type === 'video'
                || item.item_type === 'non_music_track'
            ))
            .map(item => mapToTrack(item));
    }

    public async addTrackToHistory(id: string): Promise<void> {
        const poToken = await this.tokenProvider.getToken(id);
        const trackInfo = await this.innertube.music.getInfo(id, { po_token: poToken });
        await trackInfo.addToWatchHistory();
    }
}

type CacheEntry = { client: PersonalMusicClient; lastUsed: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CLIENTS = 100;

const inputFromRecord = (record: YouTubeMusicConnectionRecord) => ({
    cookie: decryptSecret(record.cookieCiphertext),
    authUser: record.authUser,
    pageId: record.pageId,
    language: record.language
});

const pruneCache = (): void => {
    const now = Date.now();
    cache.forEach((entry, key) => {
        if (entry.lastUsed + CACHE_TTL_MS <= now) cache.delete(key);
    });
    while (cache.size >= MAX_CLIENTS) {
        const oldest = [...cache.entries()].sort((left, right) => left[1].lastUsed - right[1].lastUsed)[0];
        if (!oldest) break;
        cache.delete(oldest[0]);
    }
};

export const personalMusicClients = {
    async get(userId: string): Promise<PersonalMusicClient> {
        pruneCache();
        const cached = cache.get(userId);
        if (cached) {
            cached.lastUsed = Date.now();
            return cached.client;
        }
        const record = await database.getMusicConnection(userId);
        if (!record || record.status !== 'connected') throw new HttpError(409, 'YouTube Music connection is required');
        try {
            const client = await PersonalMusicClient.create(inputFromRecord(record));
            cache.set(userId, { client, lastUsed: Date.now() });
            return client;
        } catch {
            await database.markMusicConnectionError(userId);
            throw new HttpError(409, 'YouTube Music connection must be renewed');
        }
    },

    async connect(userId: string, input: MusicConnectionInput): Promise<void> {
        const normalized = {
            cookie: validateCookie(input.cookie),
            authUser: input.authUser ?? 0,
            pageId: input.pageId?.trim() || undefined,
            language: input.language?.trim() || 'ru'
        };
        if (!Number.isInteger(normalized.authUser) || normalized.authUser < 0) {
            throw new HttpError(400, 'authUser must be a non-negative integer');
        }
        if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(normalized.language)) {
            throw new HttpError(400, 'language must be a language code such as ru or en-US');
        }
        let client: PersonalMusicClient;
        try {
            client = await PersonalMusicClient.create(normalized);
            if (!client.isAuthenticated()) throw new Error('Cookie did not create an authenticated session');
            await client.getHomeFeed();
        } catch {
            throw new HttpError(400, 'YouTube Music rejected this cookie');
        }
        await database.saveMusicConnection({
            userId,
            cookieCiphertext: encryptSecret(normalized.cookie),
            authUser: normalized.authUser,
            pageId: normalized.pageId,
            language: normalized.language,
            status: 'connected'
        });
        cache.set(userId, { client, lastUsed: Date.now() });
    },

    async disconnect(userId: string): Promise<void> {
        cache.delete(userId);
        await database.deleteMusicConnection(userId);
    },

    evict(userId: string): void {
        cache.delete(userId);
    }
};
