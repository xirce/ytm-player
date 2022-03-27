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
import { formatTimeSeconds } from '../../utils/formatting';
import { SliderWrapper } from '../Slider/SliderWrapper';
import { PlayerButton, TransparentButton } from './PlayerButton';
import { VolumeControls } from './VolumeControls';

export const AudioPlayer: React.FC = () => {
    const audio = useRef(new Audio());
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState('0:00');
    const [duration, setDuration] = useState('0:00');

    const handleTimeUpdate = (event: Event) => {
        const audioElement = event.target as HTMLAudioElement;
        setCurrentTime(formatTimeSeconds(audioElement?.currentTime));
    }

    const handleLoadedMetadata = (event: Event) => {
        const audioElement = event.target as HTMLAudioElement;
        setDuration(formatTimeSeconds(audioElement?.duration));
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
            justifyContent='center'
            alignItems='center'
            sx={(theme) => ({
                height: '6rem',
                color: theme.palette.primary.light,
                backgroundColor: theme.palette.primary.dark,
                borderTop: '1px solid',
                borderTopColor: theme.palette.primary.main,
                padding: '0 1rem',
                textAlign: 'center',
            })}
        >
            <Grid item xs>ИНФОРМАЦИЯ О ТРЕКЕ</Grid>
            <Grid item xs={4}>
                <Stack>
                    <Grid container justifyContent='center' alignItems='center' gap={2} marginBottom={1}>
                        <TransparentButton>
                            <SkipPreviousRounded fontSize='large' />
                        </TransparentButton>
                        <PlayerButton
                            onClick={() => setIsPlaying(!isPlaying)}
                            sx={(theme) => ({ backgroundColor: theme.palette.text.primary })}
                        >
                            {isPlaying ? <PlayArrowRounded /> : <PauseRounded />}
                        </PlayerButton>
                        <TransparentButton>
                            <SkipNextRounded fontSize='large' />
                        </TransparentButton>
                    </Grid>
                    <Grid container justifyContent='space-between' alignItems='stretch' direction='row' gap={1} fontSize={'small'}>
                        <Grid item><Box sx={{ verticalAlign: 'center' }}>{currentTime}</Box></Grid>
                        <Grid container item xs justifyContent='center' alignItems='baseline'>
                            <Grid item xs>
                                <SliderWrapper defaultValue={0} sx={{ color: 'primary.light', top: '50%', transform: 'translateY(-50%)' }} />
                            </Grid>
                        </Grid>
                        <Grid item><Box>{duration}</Box></Grid>
                    </Grid>
                </Stack>
            </Grid>
            <Grid item xs>
                <VolumeControls />
            </Grid>
        </Grid>);
}