import { Innertube, MusicPlaylistShelfContinuation, Platform, Types, UniversalCache, YTMusic, YTNodes } from 'youtubei.js';
import { IHomeItem, IHomeSectionPage, IPlaylist, IPlaylistPage, ITrackBase, YouTubeAuthState } from '../shared';
import { getThumbnailUrl, mapPlaylistPanelVideoToTrack, mapToArtistInfo, mapToHomeItem, mapToTrack } from '../mappings/ytmusic-api';
import { HttpTokenProvider, TokenProvider } from './tokenProvider';

const validateMusicCookie = (cookie: string): string => {
    const invalidIndex = Array.from(cookie).findIndex(character => {
        const code = character.codePointAt(0) ?? 0;
        return code < 0x20 || code > 0x7e;
    });
    if (invalidIndex !== -1) {
        const character = Array.from(cookie)[invalidIndex];
        const hint = character === '…'
            ? ' The value was truncated by DevTools; copy the complete Cookie header using "Copy as cURL".'
            : '';
        throw new Error(`YOUTUBE_MUSIC_COOKIE contains an invalid character at index ${invalidIndex}.${hint}`);
    }
    return cookie.replace(/^cookie:\s*/i, '');
};

const getMusicAccountIndex = (): number => {
    const value = process.env.YOUTUBE_MUSIC_AUTHUSER?.trim() || '0';
    if (!/^\d+$/.test(value)) {
        throw new Error('YOUTUBE_MUSIC_AUTHUSER must be a non-negative integer');
    }
    return Number.parseInt(value, 10);
};

export class YTMusicApiWrapper {
    private innertube!: Innertube;
    private authenticationInnertube!: Innertube;
    private musicAuthenticationInnertube?: Innertube;
    private tokenProvider!: TokenProvider;
    private authState: YouTubeAuthState = { status: 'anonymous' };
    private authenticationPromise?: Promise<void>;

    public async initialize() {
        Platform.shim.eval = async (data: Types.BuildScriptResult) => {
            return new Function(data.output)();;
        };

        const tokenProviderUrl = process.env.YOUTUBE_PO_TOKEN_PROVIDER_URL?.trim()
            || 'http://127.0.0.1:4416';

        this.tokenProvider ??= new HttpTokenProvider(tokenProviderUrl);
        const cache = new UniversalCache(
            true,
            process.env.YOUTUBE_CACHE_DIR?.trim() || '.cache/youtubei'
        );
        // YouTube rejects OAuth bearer tokens on public YT Music endpoints such as
        // /search with INVALID_ARGUMENT. Keep catalog requests anonymous and use a
        // dedicated session for OAuth/account operations.
        this.innertube ??= await Innertube.create({ cache });
        this.authenticationInnertube ??= await Innertube.create({
            cache,
            retrieve_player: false
        });
        const configuredMusicCookie = process.env.YOUTUBE_MUSIC_COOKIE?.trim();
        const musicCookie = configuredMusicCookie
            ? validateMusicCookie(configuredMusicCookie)
            : undefined;
        if (musicCookie) {
            this.musicAuthenticationInnertube ??= await Innertube.create({
                cache,
                cookie: musicCookie,
                account_index: getMusicAccountIndex(),
                on_behalf_of_user: process.env.YOUTUBE_MUSIC_PAGE_ID?.trim() || undefined,
                enable_session_cache: false,
                lang: process.env.YOUTUBE_MUSIC_LANGUAGE?.trim() || 'ru',
                retrieve_player: false
            });
        }
        this.registerAuthenticationEvents();
        if (await cache.get('youtubei_oauth_credentials')) {
            this.authState = { status: 'restoring' };
            this.authenticationPromise = this.authenticationInnertube.session.signIn()
                .catch(error => {
                    if (this.musicAuthenticationInnertube) {
                        this.setAuthenticatedState(false);
                    } else {
                        this.authState = { status: 'error', error: (error as Error).message };
                    }
                })
                .finally(() => {
                    this.authenticationPromise = undefined;
                });
            await this.authenticationPromise;
        } else if (this.musicAuthenticationInnertube) {
            this.setAuthenticatedState(false);
        }

        console.log(`YouTube PO token provider: ${tokenProviderUrl}`);
    }

    public getAuthenticationState(): YouTubeAuthState {
        return { ...this.authState };
    }

    public hasPersonalizedMusicAccess(): boolean {
        return Boolean(this.musicAuthenticationInnertube?.session.logged_in);
    }

    public async getHomeFeed(): Promise<YTMusic.HomeFeed> {
        if (!this.musicAuthenticationInnertube) {
            throw new Error('YouTube Music cookie authentication is not configured');
        }
        return this.musicAuthenticationInnertube.music.getHomeFeed();
    }

    public async getHomeSectionPage(request: { browseId?: string; params?: string; continuation?: string }): Promise<IHomeSectionPage> {
        if (!this.musicAuthenticationInnertube) {
            throw new Error('YouTube Music cookie authentication is not configured');
        }
        const response = await this.musicAuthenticationInnertube.actions.execute('/browse', {
            ...request, client: 'YTMUSIC', parse: true
        });
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
        if (!this.musicAuthenticationInnertube) {
            throw new Error('YouTube Music cookie authentication is not configured');
        }
        const response = await this.musicAuthenticationInnertube.actions.execute('/browse', {
            browseId: 'FEmusic_history',
            client: 'YTMUSIC',
            parse: true
        });
        const items = response.contents_memo?.getType(YTNodes.MusicResponsiveListItem) ?? [];
        return items
            .filter(item => Boolean(item.id) && (
                item.item_type === 'song'
                || item.item_type === 'video'
                || item.item_type === 'non_music_track'
            ))
            .map(item => mapToTrack(item));
    }

    public async startAuthentication(): Promise<YouTubeAuthState> {
        if (this.authenticationInnertube.session.logged_in || this.authenticationPromise) {
            return this.getAuthenticationState();
        }

        this.authState = { status: 'starting' };
        let resolveStarted: () => void = () => undefined;
        const started = new Promise<void>(resolve => { resolveStarted = resolve; });
        const onPending = () => resolveStarted();
        const onAuth = () => resolveStarted();
        const onError = () => resolveStarted();
        this.authenticationInnertube.session.once('auth-pending', onPending);
        this.authenticationInnertube.session.once('auth', onAuth);
        this.authenticationInnertube.session.once('auth-error', onError);

        this.authenticationPromise = this.authenticationInnertube.session.signIn()
            .catch(error => {
                this.authState = { status: 'error', error: (error as Error).message };
                resolveStarted();
            })
            .finally(() => {
                this.authenticationPromise = undefined;
            });

        await started;
        this.authenticationInnertube.session.off('auth-pending', onPending);
        this.authenticationInnertube.session.off('auth', onAuth);
        this.authenticationInnertube.session.off('auth-error', onError);
        return this.getAuthenticationState();
    }

    public async signOut(): Promise<void> {
        if (this.authenticationInnertube.session.logged_in) {
            await this.authenticationInnertube.session.signOut();
        } else {
            await this.authenticationInnertube.session.oauth.removeCache();
        }
        if (this.musicAuthenticationInnertube) {
            this.setAuthenticatedState(false);
        } else {
            this.authState = { status: 'anonymous' };
        }
    }

    private setAuthenticatedState(hasOAuth: boolean): void {
        const hasCookie = this.hasPersonalizedMusicAccess();
        this.authState = {
            status: 'authenticated',
            method: hasOAuth && hasCookie ? 'oauth+cookie' : hasCookie ? 'cookie' : 'oauth',
            musicRecommendationsAvailable: hasCookie
        };
    }

    private registerAuthenticationEvents(): void {
        this.authenticationInnertube.session.on('auth-pending', data => {
            this.authState = {
                status: 'pending',
                verificationUrl: data.verification_url,
                userCode: data.user_code,
                expiresAt: Date.now() + data.expires_in * 1000
            };
        });
        this.authenticationInnertube.session.on('auth', () => {
            this.setAuthenticatedState(true);
            void this.authenticationInnertube.session.oauth.cacheCredentials();
        });
        this.authenticationInnertube.session.on('update-credentials', () => {
            void this.authenticationInnertube.session.oauth.cacheCredentials();
        });
        this.authenticationInnertube.session.on('auth-error', error => {
            this.authState = { status: 'error', error: error.message };
        });
    }

    public async search(query: string) {
        const [songs, artists, albums, playlists] = await Promise.all([
            this.searchSongs(query),
            this.searchArtists(query),
            this.searchAlbums(query),
            this.searchPlaylists(query)
        ]);
        return { songs, artists, albums, playlists };
    }

    public async searchSongs(query: string): Promise<YTNodes.MusicResponsiveListItem[]> {
        const result = await this.innertube.music.search(query, {
            type: "song"
        });

        return result.songs?.contents ?? [];
    }

    public async searchArtists(query: string): Promise<YTNodes.MusicResponsiveListItem[]> {
        const result = await this.innertube.music.search(query, { type: 'artist' });
        return result.artists?.contents ?? [];
    }

    public async searchAlbums(query: string): Promise<YTNodes.MusicResponsiveListItem[]> {
        const result = await this.innertube.music.search(query, { type: 'album' });
        return result.albums?.contents ?? [];
    }

    public async searchPlaylists(query: string): Promise<YTNodes.MusicResponsiveListItem[]> {
        const result = await this.innertube.music.search(query, { type: 'playlist' });
        return result.playlists?.contents ?? [];
    }

    public async getSearchSuggestions(query: string): Promise<string[]> {
        const sections = await this.innertube.music.getSearchSuggestions(query);
        return sections.flatMap(section =>
            section.contents
                .filter((item): item is typeof item & { suggestion: { toString(): string } } =>
                    'suggestion' in item
                )
                .map(item => item.suggestion.toString())
        );
    }

    public async getTrackUrl(id: string, urlTransformer?: (url: URL) => URL): Promise<string | undefined> {
        const poToken = await this.tokenProvider.getToken(id);
        const musicInfo = await this.innertube.music.getInfo(id, { po_token: poToken });

        const url = await musicInfo.toDash({
            url_transformer: mediaUrl => {
                mediaUrl.searchParams.set('pot', poToken);
                return urlTransformer?.(mediaUrl) ?? mediaUrl;
            },
            format_filter: () => false
        });
        return url;
    }

    public async addTrackToHistory(id: string): Promise<void> {
        if (!this.musicAuthenticationInnertube) {
            throw new Error('YouTube Music cookie authentication is not configured');
        }
        const poToken = await this.tokenProvider.getToken(id);
        const trackInfo = await this.musicAuthenticationInnertube.music.getInfo(id, {
            po_token: poToken
        });
        await trackInfo.addToWatchHistory();
    }

    public async getArtist(id: string): Promise<YTMusic.Artist> {
        return this.innertube.music.getArtist(id);
    }

    public async getRadio(radioId: string): Promise<ITrackBase[]> {
        if (radioId.startsWith('RDAMVM')) {
            const videoId = radioId.slice('RDAMVM'.length);
            const panel = await this.innertube.music.getUpNext(videoId, true);
            return panel.contents
                .filter((item): item is YTNodes.PlaylistPanelVideo =>
                    item instanceof YTNodes.PlaylistPanelVideo && Boolean(item.video_id)
                )
                .map(mapPlaylistPanelVideoToTrack);
        }

        return (await this.getPlaylistWithVideos(radioId)).tracks;
    }

    public async getArtistTracks(id: string): Promise<IPlaylistPage> {
        const artist = await this.getArtist(id);
        const info = mapToArtistInfo(artist, id);
        const songShelf = artist.sections
            .filter((section): section is YTNodes.MusicShelf => section instanceof YTNodes.MusicShelf)
            .find(section => section.contents.some(item => item.item_type === 'song'));
        if (!songShelf?.endpoint) return { tracks: [], continuation: null };

        const response = await songShelf.endpoint.call(this.innertube.actions, {
            client: 'YTMUSIC',
            parse: true
        });
        const shelf = response.contents_memo?.getType(YTNodes.MusicPlaylistShelf)?.[0];
        if (!shelf) return { tracks: [], continuation: null };
        const continuationItem = shelf.contents.find(
            (item): item is YTNodes.ContinuationItem => item instanceof YTNodes.ContinuationItem
        );

        return {
            tracks: shelf.contents
                .filter((item): item is YTNodes.MusicResponsiveListItem =>
                    item instanceof YTNodes.MusicResponsiveListItem && Boolean(item.id)
                )
                .map(item => mapToTrack(item, {
                    artist: { id, name: info.name },
                    imageUrl: info.imageUrl
                })),
            continuation: shelf.continuation
                ?? (typeof continuationItem?.endpoint.payload.token === 'string'
                    ? continuationItem.endpoint.payload.token
                    : null)
        };
    }

    public async getArtistTracksContinuation(continuation: string): Promise<IPlaylistPage> {
        const response = await this.innertube.actions.execute('/browse', {
            continuation,
            client: 'YTMUSIC',
            parse: true
        });
        const continuationShelf = response.continuation_contents?.is(MusicPlaylistShelfContinuation)
            ? response.continuation_contents.as(MusicPlaylistShelfContinuation)
            : undefined;
        const appendedItems = response.on_response_received_actions
            ?.firstOfType(YTNodes.AppendContinuationItemsAction);
        const contents = Array.from(continuationShelf?.contents ?? appendedItems?.contents ?? []);
        const items = contents.filter(
            (item): item is YTNodes.MusicResponsiveListItem => item instanceof YTNodes.MusicResponsiveListItem
        );
        const continuationItem = contents.find(
            (item): item is YTNodes.ContinuationItem => item instanceof YTNodes.ContinuationItem
        );
        return {
            tracks: items
                .filter(item => Boolean(item.id))
                .map(item => mapToTrack(item)),
            continuation: continuationShelf?.continuation
                ?? (typeof continuationItem?.endpoint.payload.token === 'string'
                    ? continuationItem.endpoint.payload.token
                    : null)
        };
    }

    public async getAlbum(id: string) {
        return this.innertube.music.getAlbum(id);
    }

    private getPlaylistInnertube(_playlistId: string): Innertube {
        return this.musicAuthenticationInnertube ?? this.innertube;
    }

    public async getPlaylist(playlistId: string, browseParams?: string): Promise<YTMusic.Playlist> {
        const normalizedId = playlistId.startsWith('VL') ? playlistId : `VL${playlistId}`;
        const innertube = this.getPlaylistInnertube(normalizedId);

        if (browseParams) {
            const response = await innertube.actions.execute('/browse', {
                browseId: normalizedId,
                params: browseParams,
                client: 'YTMUSIC'
            });
            return new YTMusic.Playlist(response, innertube.actions);
        }
        return innertube.music.getPlaylist(normalizedId);
    }

    private mapPlaylistPage(page: YTMusic.Playlist, fallbackImageUrl = ''): IPlaylistPage {
        const items = page.items.filter(
            (item): item is YTNodes.MusicResponsiveListItem =>
                item instanceof YTNodes.MusicResponsiveListItem
        );
        const continuation = page.items.find(
            (item): item is YTNodes.ContinuationItem => item instanceof YTNodes.ContinuationItem
        );
        return {
            tracks: items
                .filter(item => item.id)
                .map(item => mapToTrack(item, { imageUrl: fallbackImageUrl })),
            continuation: typeof continuation?.endpoint.payload.token === 'string'
                ? continuation.endpoint.payload.token
                : null
        };
    }

    public async getPlaylistContinuation(playlistId: string, continuation: string): Promise<IPlaylistPage> {
        const innertube = this.getPlaylistInnertube(playlistId);
        const response = await innertube.actions.execute('/browse', {
            continuation,
            client: 'YTMUSIC'
        });
        return this.mapPlaylistPage(new YTMusic.Playlist(response, innertube.actions));
    }

    public async getPlaylistWithVideos(playlistId: string, browseParams?: string): Promise<IPlaylist> {
        const page = await this.getPlaylist(playlistId, browseParams);
        const header = page.header;
        const items = page.items.filter(
            (item): item is YTNodes.MusicResponsiveListItem =>
                item instanceof YTNodes.MusicResponsiveListItem
        );

        const thumbnail = header && 'thumbnail' in header
            ? header.thumbnail?.contents
            : header && 'thumbnails' in header
                ? header.thumbnails
                : undefined;
        const imageUrl = getThumbnailUrl(thumbnail) || getThumbnailUrl(items[0]?.thumbnails);
        const playlistPage = this.mapPlaylistPage(page, imageUrl);

        return {
            info: {
                id: playlistId,
                name: header && 'title' in header
                    ? header.title.toString()
                    : '',
                imageUrl,
                trackCount: playlistPage.continuation ? null : playlistPage.tracks.length,
                browseParams,
                radioId: `RDAMPL${playlistId.replace(/^VL/, '')}`
            },
            ...playlistPage
        };
    }
}

const ytmusic = new YTMusicApiWrapper();

export default ytmusic;
