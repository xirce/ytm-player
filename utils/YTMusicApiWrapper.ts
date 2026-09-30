import { Constants, Innertube, MusicPlaylistShelfContinuation, Platform, Types, UniversalCache, YTMusic, YTNodes } from 'youtubei.js';
import { IPlaylist, IPlaylistPage, ISabrFormat, ITrackBase } from '../shared';
import { getThumbnailUrl, mapPlaylistPanelVideoToTrack, mapToArtistInfo, mapToTrack } from '../mappings/ytmusic-api';
import { HttpTokenProvider, TokenProvider } from './tokenProvider';
import { performance } from 'node:perf_hooks';

export interface TrackUrlTimings {
    poToken: number;
    playerInfo: number;
    dashManifest: number;
    total: number;
}

export interface TrackUrlResult {
    manifest?: string;
    poToken: string;
    streamingUrl?: string;
    ustreamerConfig?: string;
    clientInfo: {
        clientName: number;
        clientVersion: string;
        osName: string;
        osVersion: string;
    };
    formats: ISabrFormat[];
    timings: TrackUrlTimings;
}

export class YTMusicApiWrapper {
    private innertube!: Innertube;
    private tokenProvider!: TokenProvider;

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
        this.innertube ??= await Innertube.create({ cache });

        console.log(`YouTube PO token provider: ${tokenProviderUrl}`);
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

    public async getTrackUrl(
        id: string,
        urlTransformer?: (url: URL) => URL,
        seedUrlTransformer?: (url: URL) => URL
    ): Promise<TrackUrlResult> {
        const startedAt = performance.now();
        const poToken = await this.tokenProvider.getToken(id);
        const tokenReadyAt = performance.now();
        const musicInfo = await this.innertube.music.getInfo(id, { po_token: poToken });
        const infoReadyAt = performance.now();

        const manifest = await musicInfo.toDash({
            url_transformer: mediaUrl => urlTransformer?.(mediaUrl) ?? mediaUrl,
            format_filter: format => !format.has_audio || format.has_video,
            manifest_options: { is_sabr: true }
        });
        const serverAbrUrl = musicInfo.streaming_data?.server_abr_streaming_url;
        const streamingUrl = serverAbrUrl
            ? await this.innertube.session.player?.decipher(serverAbrUrl)
            : undefined;
        const ustreamerConfig = musicInfo.player_config?.media_common_config
            .media_ustreamer_request_config?.video_playback_ustreamer_config;
        const context = this.innertube.session.context.client;
        const clientName = Number(Constants.CLIENT_NAME_IDS[
            context.clientName as keyof typeof Constants.CLIENT_NAME_IDS
        ] ?? Constants.CLIENT_NAME_IDS.WEB_REMIX);
        const formats = await Promise.all((musicInfo.streaming_data?.adaptive_formats ?? [])
            .filter(format => format.has_audio && !format.has_video)
            .map(async format => {
                let seedUrl: string | undefined;
                try {
                    const directUrl = await format.decipher(this.innertube.session.player);
                    if (directUrl) {
                        seedUrl = seedUrlTransformer?.(new URL(directUrl)).toString();
                    }
                } catch {
                    // Playback remains available when a direct seed URL cannot be deciphered.
                }
                return {
                    itag: format.itag,
                    seedUrl,
                    last_modified_ms: format.last_modified_ms,
                    xtags: format.xtags,
                    width: format.width,
                    height: format.height,
                    mime_type: format.mime_type,
                    audio_quality: format.audio_quality,
                    bitrate: format.bitrate,
                    average_bitrate: format.average_bitrate,
                    quality: format.quality,
                    quality_label: format.quality_label,
                    audio_track: format.audio_track ? { id: format.audio_track.id } : undefined,
                    approx_duration_ms: format.approx_duration_ms,
                    content_length: format.content_length,
                    is_drc: format.is_drc,
                    language: format.language,
                    is_dubbed: format.is_dubbed,
                    is_auto_dubbed: format.is_auto_dubbed,
                    is_descriptive: format.is_descriptive,
                    is_secondary: format.is_secondary,
                    is_original: format.is_original
                };
            }));
        const finishedAt = performance.now();
        return {
            manifest,
            poToken,
            streamingUrl,
            ustreamerConfig,
            clientInfo: {
                clientName,
                clientVersion: context.clientVersion,
                osName: context.osName,
                osVersion: context.osVersion
            },
            formats,
            timings: {
                poToken: tokenReadyAt - startedAt,
                playerInfo: infoReadyAt - tokenReadyAt,
                dashManifest: finishedAt - infoReadyAt,
                total: finishedAt - startedAt
            }
        };
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
        return this.innertube;
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
