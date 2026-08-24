import YTMusic, { PlaylistFull, VideoDetailed } from "ytmusic-api";
import { mapToPlaylistInfo } from "../mappings/ytmusic-api";
import { ITrackBase, IPlaylist } from '../shared';
import { parseNextTrack, parsePlaylistTrack } from "./parsers";

export class YTMusicApiWrapper extends YTMusic {
    private readonly _constructRequest = this['constructRequest'].bind(this);

    public override async getPlaylist(playlistId: string): Promise<PlaylistFull> {
        const validPlaylistId = YTMusicApiWrapper.getValidPlaylistId(playlistId);

        return super.getPlaylist(validPlaylistId);
    }

    public override async getPlaylistVideos(playlistId: string): Promise<Omit<VideoDetailed, "views">[]> {
        const validPlaylistId = YTMusicApiWrapper.getValidPlaylistId(playlistId);

        return super.getPlaylistVideos(validPlaylistId);
    }

    public async getPlaylistWithVideos(playlistId: string): Promise<IPlaylist> {
        const validPlaylistId = YTMusicApiWrapper.getValidPlaylistId(playlistId);
        const playlist = await this.getPlaylist(validPlaylistId);
        const videos = await this.getPlaylistVideos(validPlaylistId);
        const playlistInfo = mapToPlaylistInfo(playlist);
        const tracks: ITrackBase[] = videos.map(parsePlaylistTrack);

        return {
            info: playlistInfo,
            tracks: tracks
        };
    }

    public async getRadio(id: string): Promise<ITrackBase[]> {
        const request = YTMusicApiWrapper.getRadioRequest(id);
        const data = await this._constructRequest('next', request);
        const contents = data.contents
            .singleColumnMusicWatchNextResultsRenderer
            .tabbedRenderer.watchNextTabbedResultsRenderer.tabs[0]
            .tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents;

        return contents.map((content: any) => parseNextTrack(content.playlistPanelVideoRenderer));
    }

    private static getRadioRequest(id: string): object {
        const request: any = { playlistId: id };

        if (id.startsWith('RDAMVM')) {
            request.videoId = id.slice(6);
        }

        return request;
    }

    private async getContinuation(continuationKey: string): Promise<any> {
        return await this._constructRequest('browse', {}, { continuation: continuationKey });
    }

    private static getValidPlaylistId(playlistId: string): string {
        if (playlistId.startsWith('RDC') || playlistId.startsWith('PL')) {
            playlistId = 'VL' + playlistId;
        }

        return playlistId;
    }
}

const ytmusic = new YTMusicApiWrapper();

export default ytmusic;
