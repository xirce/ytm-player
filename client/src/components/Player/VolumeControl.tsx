import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import { VolumeOffRounded, VolumeUpRounded } from '@mui/icons-material';
import classNames from 'classnames';
import type { MediaPlayerClass } from 'dashjs';
import { SliderWrapper } from '../Slider/SliderWrapper';
import styles from './PlayerControls.module.css';
import { loadPlayerVolume, savePlayerVolume } from '../../utils/playerPersistence';

interface VolumeControlsProps {
    player: MediaPlayerClass;
    ignorePlayerVolumeChanges?: boolean;
}

export const VolumeControl: React.FC<VolumeControlsProps> = React.memo(({
    player,
    ignorePlayerVolumeChanges = false
}) => {
    const initialVolume = loadPlayerVolume();
    const [isMuted, setIsMuted] = useState(initialVolume?.muted ?? false);
    const [volume, setVolume] = useState(initialVolume?.volume ?? 1);
    const [prevVolume, setPrevVolume] = useState(initialVolume?.volume ?? 1);

    useEffect(() => {
        if (!ignorePlayerVolumeChanges) {
            const persisted = loadPlayerVolume();
            const vol = persisted?.volume ?? player.getVolume() ?? 1;
            const muted = persisted?.muted ?? player.isMuted() ?? false;
            player.setVolume(vol);
            player.setMute(muted);
            setVolume(vol);
            setPrevVolume(vol);
            setIsMuted(muted);
        }

        const onVolumeChanged = () => {
            if (ignorePlayerVolumeChanges) return;
            setVolume(player.getVolume());
            setIsMuted(player.isMuted());
        };

        // Используем строковое имя события (одинарные кавычки)
        player.on('playbackVolumeChanged', onVolumeChanged);

        return () => {
            player.off('playbackVolumeChanged', onVolumeChanged);
        };
    }, [player, ignorePlayerVolumeChanges]);

    const changeVolume = (event: Event, value: number) => {
        if (isMuted) {
            setIsMuted(false);
        }
        player.setVolume(value);
        setVolume(value);
        savePlayerVolume({ volume: value, muted: false });
    };

    const handleMute = () => {
        if (isMuted) {
            player.setVolume(prevVolume);
            player.setMute(false);
            setIsMuted(false);
            setVolume(prevVolume);
            savePlayerVolume({ volume: prevVolume, muted: false });
        } else {
            setPrevVolume(volume);
            player.setVolume(0);
            player.setMute(true);
            setIsMuted(true);
            setVolume(0);
            savePlayerVolume({ volume: prevVolume, muted: true });
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
