import { Router } from 'express';
import { ytmusic } from "../server";
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
    } catch (error) {
        res.sendStatus(400);
    }
})

export default router;