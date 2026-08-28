import { Innertube, Platform, Types, YTMusic, YTNodes } from 'youtubei.js';
import { IPlaylist } from '../shared';
import { VideoDetailed } from "ytmusic-api";
import { mapToPlaylistInfo, mapToTrack } from '../mappings/ytmusic-api';

export class YTMusicApiWrapper {
    private innertube!: Innertube;

    public async initialize() {
        Platform.shim.eval = async (data: Types.BuildScriptResult) => {
            return new Function(data.output)();;
        };
        this.innertube ??= await Innertube.create();
    }

    public async search(query: string): Promise<YTMusic.Search> {
        return this.innertube.music.search(query);
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
        const musicInfo = await this.innertube.music.getInfo(id);

        const url = await musicInfo.toDash({
            url_transformer: urlTransformer,
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

    public async getPlaylistVideos(playlistId: string): Promise<Omit<VideoDetailed, "views">[]> {
        return [];
    }

    public async getPlaylistWithVideos(playlistId: string): Promise<IPlaylist> {
        const playlist = await this.getPlaylist(playlistId);
        const tracks = playlist.items
            .filter((item: unknown) => item instanceof YTNodes.MusicResponsiveListItem)
            .map((item: unknown) => mapToTrack(item as YTNodes.MusicResponsiveListItem));
        const firstTrack = playlist.items.find((item: unknown) => item instanceof YTNodes.MusicResponsiveListItem);

        if (!firstTrack) {
            throw new Error(`Playlist has no tracks: ${playlistId}`);
        }

        return {
            info: {
                ...mapToPlaylistInfo(firstTrack as YTNodes.MusicResponsiveListItem),
                id: playlistId,
                name: playlist.header && 'title' in playlist.header
                    ? playlist.header.title.toString()
                    : (firstTrack as YTNodes.MusicResponsiveListItem).title!,
                radioId: `RDAMPL${playlistId}`
            },
            tracks
        };
    }
}

const ytmusic = new YTMusicApiWrapper();

export default ytmusic;
