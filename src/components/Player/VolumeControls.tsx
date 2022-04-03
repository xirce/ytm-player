import {VolumeOffRounded, VolumeUpRounded} from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import classNames from 'classnames';
import React, {useRef, useState} from 'react';
import {SliderWrapper} from '../Slider/SliderWrapper';
import styles from './Player.module.css';

interface VolumeControlsProps {
    audioElement: HTMLAudioElement;
}

export const VolumeControls: React.FC<VolumeControlsProps> = ({audioElement}) => {
    const audio = useRef(audioElement);
    const [isMuted, setIsMuted] = useState(false);

    return (
        <Grid container justifyContent='center' alignItems='center' direction='row' gap={2}>
            <Grid item>
                <button className={classNames(styles.btn, styles.iconBtn)} onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <VolumeOffRounded/> : <VolumeUpRounded/>}
                </button>
            </Grid>
            <Grid container item xs={5}>
                <SliderWrapper defaultValue={100}/>
            </Grid>
        </Grid>
    );
}