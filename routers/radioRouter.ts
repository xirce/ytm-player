import { Router } from 'express';
import ytmusic from '../utils/YTMusicApiWrapper';

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const radio = await ytmusic.getRadio(id);
        res.json(radio);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);
    }
});

export default router;