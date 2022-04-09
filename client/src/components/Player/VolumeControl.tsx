import {VolumeOffRounded, VolumeUpRounded} from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import classNames from 'classnames';
import React, {MutableRefObject, useEffect, useRef, useState} from 'react';
import {SliderWrapper} from '../Slider/SliderWrapper';
import styles from './PlayerControls.module.css';

interface VolumeControlsProps {
    audio: MutableRefObject<HTMLAudioElement>;
}

export const VolumeControl: React.FC<VolumeControlsProps> = ({audio}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(audio.current.volume);
    const [prevVolume, setPrevVolume] = useState(audio.current.volume);

    const changeVolume = (event: Event, value: number) => {
        if (isMuted) {
            setIsMuted(false);
        }
        audio.current.volume = value;
    }

    const handleMute = () => {
        if (isMuted) {
            audio.current.volume = prevVolume;
        } else {
            setPrevVolume(volume);
            audio.current.volume = 0;
        }
        setIsMuted(!isMuted);
    }

    useEffect(() => {
        const handleVolumeChange = (event: Event) => {
            const audioElement = event.target as HTMLAudioElement;
            setVolume(audioElement.volume);
        }

        audio.current.addEventListener('volumechange', handleVolumeChange);

        return () => {
            audio.current.removeEventListener('volumechange', handleVolumeChange);
        }
    }, [audio.current]);

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
}