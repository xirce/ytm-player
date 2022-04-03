import Grid from '@mui/material/Grid';
import React, {useRef} from 'react';
import {VolumeControl} from './VolumeControl';
import {TrackControl} from "./TrackControl";
import {TrackInfo} from "./TrackInfo";
import styles from './PlayerControls.module.css';

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
            <Grid item xs>
                <VolumeControl audio={audio}/>
            </Grid>
        </Grid>);
});