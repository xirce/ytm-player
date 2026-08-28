import { Router } from 'express';
import ytmusic from "../utils/YTMusicApiWrapper";
import { IArtist } from '../shared';
import { mapToTrack, mapToAlbumInfo, mapToArtistInfo } from '../mappings/ytmusic-api';

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const artistInfo = await ytmusic.getArtist(id);
        const mappedArtistInfo = mapToArtistInfo(artistInfo);
        mappedArtistInfo.id = id;
        const artist: IArtist = {
            info: mappedArtistInfo,
            tracks: [],
            albums: []
        }
        res.json(artist);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

export default router;