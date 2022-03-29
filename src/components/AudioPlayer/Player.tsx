import {
    PauseRounded,
    PlayArrowRounded,
    SkipNextRounded,
    SkipPreviousRounded,
} from '@mui/icons-material';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import React, { useEffect, useRef, useState } from 'react';
import { formatSeconds } from '../../utils/formatting';
import { SliderWrapper } from '../Slider/SliderWrapper';
import { VolumeControls } from './VolumeControls';
import styles from './Player.module.css';
import classNames from 'classnames';



export const AudioPlayer: React.FC = () => {
    const audio = useRef(new Audio());
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState('0:00');
    const [duration, setDuration] = useState('0:00');

    const handleTimeUpdate = (event: Event) => {
        const audioElement = event.target as HTMLAudioElement;
        setCurrentTime(formatSeconds(audioElement?.currentTime));
    }

    const handleLoadedMetadata = (event: Event) => {
        const audioElement = event.target as HTMLAudioElement;
        setDuration(formatSeconds(audioElement?.duration));
    }

    useEffect(() => {
        audio.current.addEventListener('timeupdate', handleTimeUpdate);
        audio.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => {
            audio.current.removeEventListener('timeupdate', handleTimeUpdate);
            audio.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
    }, [])

    return (
        <Grid container
            className={styles.container}
            justifyContent='center'
            alignItems='center'
            sx={(theme) => ({
                color: theme.palette.primary.light,
                backgroundColor: theme.palette.primary.dark,
                borderTopColor: theme.palette.primary.main,
            })}
        >
            <Grid item xs>ИНФОРМАЦИЯ О ТРЕКЕ</Grid>
            <Grid item xs={4}>
                <Stack>
                    <Grid container justifyContent='center' alignItems='center' gap={2} marginBottom={1}>
                        <button className={classNames(styles.btn, styles.iconBtn)}>
                            <SkipPreviousRounded fontSize='large' />
                        </button>
                        <button className={classNames(styles.btn, styles.playPausebtn)} onClick={() => setIsPlaying(!isPlaying)}>
                            {isPlaying ? <PlayArrowRounded /> : <PauseRounded />}
                        </button>
                        <button className={classNames(styles.btn, styles.iconBtn)}>
                            <SkipNextRounded fontSize='large' />
                        </button>
                    </Grid>
                    <Grid container justifyContent='space-between' alignItems='stretch' direction='row' gap={1} fontSize={'small'}>
                        <Grid item><Box sx={{ verticalAlign: 'center' }}>{currentTime}</Box></Grid>
                        <Grid container item xs justifyContent='center' alignItems='center'>
                            <Grid item xs>
                                <SliderWrapper defaultValue={0} sx={{ color: 'primary.light' }} />
                            </Grid>
                        </Grid>
                        <Grid item><Box>{duration}</Box></Grid>
                    </Grid>
                </Stack>
            </Grid>
            <Grid item xs>
                <VolumeControls audioElement={audio.current} />
            </Grid>
        </Grid>);
}