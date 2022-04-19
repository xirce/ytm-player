import React, {useContext} from 'react';
import {PlayerContext} from "../../context/PlayerContext/PlayerContext";
import Grid from "@mui/material/Grid";
import {Link} from "react-router-dom";
import Stack from "@mui/material/Stack";
import styles from "./TrackInfo.module.css";

export const TrackInfo: React.FC = () => {
    const {tracks, trackIndex} = useContext(PlayerContext);

    return (
        <Grid container item xs justifyContent='left' alignItems='center' gap={2} direction='row'>
            <Grid item width='60px' height='60px'>
                <Link to='/'>
                    {tracks[trackIndex]?.imageUrl
                    && <img className={styles.image} alt='Track image' src={tracks[trackIndex]?.imageUrl}/>}
                </Link>
            </Grid>
            <Grid item>
                <Stack alignItems='start'>
                    <span className={styles.title}>{tracks[trackIndex]?.title ?? 'Название трека'}</span>
                    <Link to='/' className={styles.artist}>
                        <span>{tracks[trackIndex]?.artist ?? 'Артист'}</span>
                    </Link>
                </Stack>
            </Grid>
        </Grid>
    );
};