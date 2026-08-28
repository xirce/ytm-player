import { Innertube, Platform, Types, YTMusic, YTNodes } from 'youtubei.js';
import { IPlaylist } from '../shared';
import { getThumbnailUrl, mapToTrack } from '../mappings/ytmusic-api';
import { HttpTokenProvider, TokenProvider } from './tokenProvider';

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
        this.innertube ??= await Innertube.create();

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
