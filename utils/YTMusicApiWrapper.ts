import { ITrackBase, IArtistInfoBase } from './../shared/index';
import YTMusic, { PlaylistFull, VideoDetailed } from "ytmusic-api";
import Parser from "ytmusic-api/dist/parsers/Parser";
import traverse from "ytmusic-api/dist/utils/traverse";

export class YTMusicApiWrapper extends YTMusic {
    private _constructRequest = this['constructRequest'].bind(this);

    public override async getPlaylist(playlistId: string): Promise<PlaylistFull> {
        const validPlaylistId = YTMusicApiWrapper.getValidPlaylistId(playlistId);

        return super.getPlaylist(validPlaylistId);
    }

    public override async getPlaylistVideos(playlistId: string): Promise<Omit<VideoDetailed, "views">[]> {
        const validPlaylistId = YTMusicApiWrapper.getValidPlaylistId(playlistId);

        return super.getPlaylistVideos(validPlaylistId);
    }

    public async getRadio(id: string): Promise<ITrackBase[]> {
        const data = await this._constructRequest('next', { playlistId: id });
        const contents = data.contents
            .singleColumnMusicWatchNextResultsRenderer
            .tabbedRenderer.watchNextTabbedResultsRenderer.tabs[0]
            .tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents;

        return contents.map((content: any) => parseNextTrack(content.playlistPanelVideoRenderer));
    }

    private static getValidPlaylistId(playlistId: string): string {
        if (playlistId.startsWith('RDC')) {
            playlistId = 'VL' + playlistId;
        }

        return playlistId;
    }
}

function parseNextTrack(source: any): ITrackBase {
    const artistContainer = source.longBylineText.runs[0];
    const artist: IArtistInfoBase = {
        id: artistContainer.navigationEndpoint?.browseEndpoint.browseId as string,
        name: artistContainer.text
    };

    return {
        id: source.videoId,
        title: source.title.runs[0].text,
        artist: artist,
        imageUrl: source.thumbnail.thumbnails[0].url,
        duration: Parser.parseDuration(source.lengthText.runs[0].text),
        radioId: 'RDAMVM' + source.videoId
    };
}

const ytmusic = new YTMusicApiWrapper();

export default ytmusic;