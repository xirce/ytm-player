import { Router } from 'express';
import { ytmusic } from "../server";

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const artistInfo = await ytmusic.getArtist(id);
        const songs = await ytmusic.getArtistSongs(artistInfo.artistId);
        const albums = await ytmusic.getArtistAlbums(artistInfo.artistId);
        res.json([artistInfo, songs, albums]);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

export default router;