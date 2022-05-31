import { Router } from 'express';
import ytmusic from "../utils/YTMusicApiWrapper";

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const playlist = await ytmusic.getPlaylistWithVideos(id);
        res.json(playlist);
    } catch (error: any) {
        console.log(error.response);
        res.sendStatus(400);
    }
});

export default router;