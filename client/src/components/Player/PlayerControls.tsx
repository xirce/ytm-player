import React, { useRef } from 'react';
import { Link } from "react-router-dom";
import Grid from '@mui/material/Grid';
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import { VolumeControl } from './VolumeControl';
import { TrackControl } from "./TrackControl";
import { TrackInfo } from "./TrackInfo";
import { useAppSelector } from '../../store';
import { getCurrentTrack } from '../../store/player';
import styles from './PlayerControls.module.css';

export const PlayerControls: React.FC = React.memo(() => {
    const audio = useRef(new Audio());
    const currentTrack = useAppSelector(getCurrentTrack);

    return (
        <Grid
            container
            className={styles.container}
            justifyContent='center'
            alignItems='center'
            direction='row'
            visibility={currentTrack ? 'visible' : 'hidden'}
        >
            <Grid item xs>
                <TrackInfo source={currentTrack} />
            </Grid>
            <Grid item xs={4}>
                <TrackControl audio={audio} />
            </Grid>
            <Grid container item xs justifyContent='center'>
                <Grid item xs={8}>
                    <VolumeControl audio={audio} />
                </Grid>
                <Grid item>
                    <Link to='/queue'>
                        <button className={styles.iconBtn} title='Очередь'>
                            <QueueMusicRoundedIcon />
                        </button>
                    </Link>
                </Grid>
            </Grid>
        </Grid>);
});