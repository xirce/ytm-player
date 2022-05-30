import { mapToAlbumBase } from './../mappings/ytmusic-api/index';
import { Router } from 'express';
import ytmusic from "../utils/YTMusicApiWrapper";
import { IAlbum } from "../shared";
import { mapToTrack } from "../mappings/ytmusic-api";

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const albumInfo = await ytmusic.getAlbum(id);
        const tracks = albumInfo.songs.map(mapToTrack);
        const mappedAlbumInfo = mapToAlbumBase(albumInfo);
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