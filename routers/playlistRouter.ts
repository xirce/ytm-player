import { Router } from 'express';
import ytmusic from "../utils/YTMusicApiWrapper";
import { mapToTrack } from "../mappings/ytmusic-api";
import { IPlaylist } from "../shared";

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const playlistInfo = await ytmusic.getPlaylist(id);
        const videos = await ytmusic.getPlaylistVideos(id);
        const tracks = videos.map(mapToTrack);
        const playlist: IPlaylist = {
            id: playlistInfo.playlistId,
            name: playlistInfo.name,
            imageUrl: playlistInfo.thumbnails[2].url,
            tracksCount: playlistInfo.videoCount,
            tracks: tracks
        }
        res.json(playlist);
    } catch (error: any) {
        console.log(error.response);
        res.sendStatus(400);
    }
})

export default router;