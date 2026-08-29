import { Innertube, Platform, Types, UniversalCache, YTMusic, YTNodes } from 'youtubei.js';
import { IPlaylist, YouTubeAuthState } from '../shared';
import { getThumbnailUrl, mapToTrack } from '../mappings/ytmusic-api';
import { HttpTokenProvider, TokenProvider } from './tokenProvider';

export class YTMusicApiWrapper {
    private innertube!: Innertube;
    private authenticationInnertube!: Innertube;
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
        this.registerAuthenticationEvents();
        if (await cache.get('youtubei_oauth_credentials')) {
            this.authState = { status: 'restoring' };
            this.authenticationPromise = this.authenticationInnertube.session.signIn()
                .catch(error => {
                    this.authState = { status: 'error', error: (error as Error).message };
                })
                .finally(() => {
                    this.authenticationPromise = undefined;
                });
            await this.authenticationPromise;
        }

        console.log(`YouTube PO token provider: ${tokenProviderUrl}`);
    }

    public getAuthenticationState(): YouTubeAuthState {
        return { ...this.authState };
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
        this.authState = { status: 'anonymous' };
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
            this.authState = { status: 'authenticated' };
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

    public async getArtist(id: string): Promise<YTMusic.Artist> {
        return this.innertube.music.getArtist(id);
    }

    public async getAlbum(id: string) {
        return this.innertube.music.getAlbum(id);
    }

    public async getPlaylist(playlistId: string): Promise<YTMusic.Playlist> {
        return this.innertube.music.getPlaylist(playlistId);
    }

    public async getPlaylistWithVideos(playlistId: string): Promise<IPlaylist> {
        let page = await this.getPlaylist(playlistId);
        const header = page.header;
        const items: YTNodes.MusicResponsiveListItem[] = [];
        for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
            items.push(...page.items.filter(
                (item): item is YTNodes.MusicResponsiveListItem =>
                    item instanceof YTNodes.MusicResponsiveListItem
            ));
            if (!page.has_continuation) break;
            page = await page.getContinuation();
        }

        const thumbnail = header && 'thumbnail' in header
            ? header.thumbnail?.contents
            : header && 'thumbnails' in header
                ? header.thumbnails
                : undefined;
        const imageUrl = getThumbnailUrl(thumbnail) || getThumbnailUrl(items[0]?.thumbnails);

        return {
            info: {
                id: playlistId,
                name: header && 'title' in header
                    ? header.title.toString()
                    : '',
                imageUrl,
                radioId: `RDAMPL${playlistId.replace(/^VL/, '')}`
            },
            tracks: items
                .filter(item => item.id)
                .map(item => mapToTrack(item, { imageUrl }))
        };
    }
}

const ytmusic = new YTMusicApiWrapper();

export default ytmusic;
