import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import { VolumeOffRounded, VolumeUpRounded } from '@mui/icons-material';
import classNames from 'classnames';
import type { MediaPlayerClass } from 'dashjs';
import { SliderWrapper } from '../Slider/SliderWrapper';
import styles from './PlayerControls.module.css';

interface VolumeControlsProps {
    player: MediaPlayerClass;
}

export const VolumeControl: React.FC<VolumeControlsProps> = React.memo(({ player }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [prevVolume, setPrevVolume] = useState(1);

    useEffect(() => {
        const vol = player.getVolume() ?? 1;
        setVolume(vol);
        setPrevVolume(vol);
        setIsMuted(player.isMuted() ?? false);

        const onVolumeChanged = () => {
            setVolume(player.getVolume());
            setIsMuted(player.isMuted());
        };

        // Используем строковое имя события (одинарные кавычки)
        player.on('playbackVolumeChanged', onVolumeChanged);

        return () => {
            player.off('playbackVolumeChanged', onVolumeChanged);
        };
    }, [player]);

    const changeVolume = (event: Event, value: number) => {
        if (isMuted) {
            setIsMuted(false);
        }
        player.setVolume(value);
        setVolume(value);
    };

    const handleMute = () => {
        if (isMuted) {
            player.setVolume(prevVolume);
            player.setMute(false);
            setIsMuted(false);
            setVolume(prevVolume);
        } else {
            setPrevVolume(volume);
            player.setVolume(0);
            player.setMute(true);
            setIsMuted(true);
            setVolume(0);
        }
    };

    return (
        <Grid container justifyContent='center' alignItems='center' direction='row' gap={2}>
            <Grid item>
                <button className={classNames(styles.btn, styles.iconBtn)} onClick={handleMute}>
                    {isMuted ? <VolumeOffRounded/> : <VolumeUpRounded/>}
                </button>
            </Grid>
            <Grid container item xs={5}>
                <SliderWrapper value={volume} onChange={changeVolume}/>
            </Grid>
        </Grid>
    );
});
