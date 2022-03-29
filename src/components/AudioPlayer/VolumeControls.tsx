import { VolumeOffRounded, VolumeUpRounded } from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import { SliderProps } from '@mui/material/Slider';
import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { SliderWrapper } from '../Slider/SliderWrapper';
import styles from './Player.module.css';

interface VolumeControlsProps {
    audioElement: HTMLAudioElement;
}

export const VolumeControls: React.FC<VolumeControlsProps> = ({ audioElement }) => {
    const audio = useRef(audioElement);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(audio.current.volume || 1);

    const handleVolumeChange = (event: Event, value: number | number[], activeThumb: number) => {
        const newSliderValue = Array.isArray(value) ? value[0] : value;
        audio.current.volume = newSliderValue / 100;
    }

    const toggleIsMuted = useEffect(() => {
        if (isMuted) {
            audio.current.volume = 0;
        } else {
            audio.current.volume = volume;
        }
    }, [isMuted]);

    return (
        <Grid container justifyContent='center' alignItems='center' direction='row' gap={2}>
            <Grid item>
                <button className={classNames(styles.btn, styles.iconBtn)} onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <VolumeOffRounded /> : <VolumeUpRounded />}
                </button>
            </Grid>
            <Grid container item xs={5}>
                <SliderWrapper onChange={handleVolumeChange} sx={{ color: 'primary.light' }} />
            </Grid>
        </Grid>
    );
}