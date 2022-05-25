import { Router } from 'express';
import ytmusic from "../utils/YTMusicApiWrapper";
import { IAlbum } from "../shared";
import { mapToArtistInfoBase, mapToTrack } from "../mappings/ytmusic-api";

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const albumInfo = await ytmusic.getAlbum(id);
        const tracks = albumInfo.songs.map(mapToTrack);
        const album: IAlbum = {
            id: albumInfo.albumId,
            name: albumInfo.name,
            year: albumInfo.year,
            imageUrl: albumInfo.thumbnails[2].url,
            artist: mapToArtistInfoBase(albumInfo.artists[0]),
            tracks: tracks
        }
        res.json(album);
    } catch (error: any) {
        console.log(error.response.data.error);
        res.sendStatus(400);
    }
})

export default router;