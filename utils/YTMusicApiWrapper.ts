import YTMusic, { PlaylistFull, VideoDetailed } from "ytmusic-api";
import PlaylistParser from 'ytmusic-api/dist/parsers/PlaylistParser';
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
        const data = await this._constructRequest('browse', { browseId: validPlaylistId });
        const playlistInfo = mapToPlaylistInfo(PlaylistParser.parse(data, validPlaylistId));
        const tracks: ITrackBase[] = [];

        const container = data.contents?.singleColumnBrowseResultsRenderer
            .tabs[0].tabRenderer.content.sectionListRenderer;
        let tracksContents = container.contents[0].musicPlaylistShelfRenderer.contents;
        let continuationKey = container.continuations?.at(0)?.nextContinuationData.continuation;

        while (tracksContents) {
            tracks.push(...tracksContents.map((content: any) => parsePlaylistTrack(content.musicResponsiveListItemRenderer)));

            if (!continuationKey) break;

            const continationData = await this.getContinuation(continuationKey);

            tracksContents = continationData?.continuationContents?.musicPlaylistShelfContinuation;
            continuationKey = tracksContents?.continuations?.at(0)?.nextContinuationData.continuation;
        }

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
