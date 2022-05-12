import React from 'react';
import { Link } from "react-router-dom";
import Grid from "@mui/material/Grid";
import { getCurrentTrack } from "../../store/player";
import { useAppSelector } from "../../store";
import styles from "./TrackInfo.module.css";
import Stack from "@mui/material/Stack";

export const TrackInfo: React.FC = () => {
    const currentTrack = useAppSelector(getCurrentTrack);

    return (
        <Grid container item xs justifyContent='left' alignItems='center' wrap='nowrap' gap={2} direction='row'>
            <Grid item width='60px' height='60px'>
                <Link to='/'>
                    {currentTrack?.imageUrl
                    && <img className={styles.image} alt='Track image' src={currentTrack?.imageUrl}/>}
                </Link>
            </Grid>
            <Grid item>
                <Stack direction='column' alignItems='start'>
                    <span className={styles.title}>{currentTrack?.title ?? 'Название трека'}</span>
                    <Link to='/' className={styles.artist}>
                        <span>{currentTrack?.artist ?? 'Артист'}</span>
                    </Link>
                </Stack>
            </Grid>
        </Grid>
    );
};