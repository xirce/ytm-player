import YTMusic, { PlaylistFull, VideoDetailed } from "ytmusic-api";

export class YTMusicApiWrapper extends YTMusic {
    public override getPlaylist(playlistId: string): Promise<PlaylistFull> {
        const validPlaylistId = YTMusicApiWrapper.getValidPlaylistId(playlistId);

        return super.getPlaylist(validPlaylistId);
    }

    public override getPlaylistVideos(playlistId: string): Promise<Omit<VideoDetailed, "views">[]> {
        const validPlaylistId = YTMusicApiWrapper.getValidPlaylistId(playlistId);

        return super.getPlaylistVideos(validPlaylistId);
    }

    private static getValidPlaylistId(playlistId: string): string {
        if (playlistId.startsWith('RD')) {
            playlistId = 'VL' + playlistId;
        }

        return playlistId;
    }
}

const ytmusic = new YTMusicApiWrapper();

export default ytmusic;