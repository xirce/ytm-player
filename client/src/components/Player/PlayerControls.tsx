import React, { useRef } from 'react';
import Grid from '@mui/material/Grid';
import { VolumeControl } from './VolumeControl';
import { TrackControl } from "./TrackControl";
import { TrackInfo } from "./TrackInfo";
import styles from './PlayerControls.module.css';
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import { Link } from "react-router-dom";

export const PlayerControls: React.FC = React.memo(() => {
    const audio = useRef(new Audio());

    return (
        <Grid container
              className={styles.container}
              justifyContent='center'
              alignItems='center'
              direction='row'
        >
            <Grid item xs>
                <TrackInfo/>
            </Grid>
            <Grid item xs={4}>
                <TrackControl audio={audio}/>
            </Grid>
            <Grid container item xs justifyContent='center'>
                <Grid item xs={8}>
                    <VolumeControl audio={audio}/>
                </Grid>
                <Grid item>
                    <Link to='/queue'>
                        <button className={styles.iconBtn} title='Очередь'>
                            <QueueMusicRoundedIcon/>
                        </button>
                    </Link>
                </Grid>
            </Grid>
        </Grid>);
});