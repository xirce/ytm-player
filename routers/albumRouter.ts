import { Router } from 'express';
import ytmusic from "../utils/YTMusicApiWrapper";
import { mapToTrack, mapToAlbumInfo } from "../mappings/ytmusic-api";
import { IAlbum } from "../shared";

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const albumInfo = await ytmusic.getAlbum(id);
        const tracks = albumInfo.songs.map(mapToTrack);
        const mappedAlbumInfo = mapToAlbumInfo(albumInfo);
        const album: IAlbum = {
            info: mappedAlbumInfo,
            tracks: tracks
        };
        res.json(album);
    } catch (error: any) {
        console.log(error.response.data.error);
        res.sendStatus(400);
    }
})

export default router;