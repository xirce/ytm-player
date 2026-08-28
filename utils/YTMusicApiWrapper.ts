import { Innertube, Platform, Types } from "youtubei.js";
import { IPlaylist } from '../shared';
import { Artist, Playlist, Search } from "youtubei.js/dist/src/parser/ytmusic";
import { VideoDetailed } from "ytmusic-api";
import { MusicResponsiveListItem } from "youtubei.js/dist/src/parser/nodes";

export class YTMusicApiWrapper {
    private innertube!: Innertube;

    public async initialize() {
        Platform.shim.eval = async (data: Types.BuildScriptResult) => {
            return new Function(data.output)();;
        };
        this.innertube ??= await Innertube.create();
    }

    public async search(query: string): Promise<Search> {
        return this.innertube.music.search(query);
    }

    public async searchSongs(query: string): Promise<MusicResponsiveListItem[]> {
        const result = await this.innertube.music.search(query, {
            type: "song"
        });

        return result.songs?.contents ?? [];
    }

    public async getTrackUrl(id: string, urlTransformer?: (url: URL) => URL): Promise<string | undefined> {
        const musicInfo = await this.innertube.music.getInfo(id);

        const url = await musicInfo.toDash({
            url_transformer: urlTransformer,
            format_filter: () => false
        });
        return url;
    }

    public async getArtist(id: string): Promise<Artist> {
        return this.innertube.music.getArtist(id);
    }

    public async getPlaylist(playlistId: string): Promise<Playlist> {
        return this.innertube.music.getPlaylist(playlistId);
    }

    public async getPlaylistVideos(playlistId: string): Promise<Omit<VideoDetailed, "views">[]> {
        return [];
    }

    public async getPlaylistWithVideos(playlistId: string): Promise<IPlaylist> {
        return null!;
    }
}

const ytmusic = new YTMusicApiWrapper();

export default ytmusic;
