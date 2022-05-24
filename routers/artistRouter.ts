import { Router } from 'express';
import { ytmusic } from "../server";
import { IArtist } from '../shared';
import { mapToTrack, mapToAlbumBase, mapToArtistInfo } from '../mappings/ytmusic-api';

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const artistInfo = await ytmusic.getArtist(id);
        const tracks = artistInfo.topSongs.map(mapToTrack);
        const albums = artistInfo.topAlbums.map(mapToAlbumBase);
        const mappedArtistInfo = mapToArtistInfo(artistInfo);
        const artist: IArtist = {
            info: mappedArtistInfo,
            tracks: tracks,
            albums: albums
        }
        res.json(artist);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

export default router;