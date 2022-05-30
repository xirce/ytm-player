import React, { MutableRefObject, useEffect } from 'react';
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { skipToken } from "@reduxjs/toolkit/query";
import { PauseRounded, PlayArrowRounded, RepeatOneRounded, RepeatRounded, Shuffle, ShuffleRounded, SkipNextRounded, SkipPreviousRounded } from "@mui/icons-material";
import { TimeProgressBar } from './TimeProgressBar';
import { useAppAction, useAppSelector } from "../../store";
import {
    getCurrentTrack,
    getIsPlaying, getTracks, getRepeat
} from '../../store/player';
import { useGetTrackUrlQuery } from '../../apiClient';
import { useDependentRef } from "../../hooks/useDependentRef";
import styles from "./PlayerControls.module.css";

export interface TrackControlProps {
    audio: MutableRefObject<HTMLAudioElement>;
}

export const TrackControl: React.FC<TrackControlProps> = React.memo(({ audio }) => {
    const { setIsPlaying, skipNext, skipPrev, setRepeat, shuffle } = useAppAction();
    const tracksRef = useDependentRef(useAppSelector(getTracks));
    const isPlaying = useAppSelector(getIsPlaying);
    const currentTrack = useAppSelector(getCurrentTrack);
    const repeat = useAppSelector(getRepeat);
    const repeatRef = useDependentRef(repeat);
    const { data: trackUrl, isFetching } = useGetTrackUrlQuery(currentTrack?.id ?? skipToken);

    useEffect(() => {
        const handlePlay = () => {
            setIsPlaying(true);
        }

        const handlePause = () => {
            setIsPlaying(false);
        }

        const handleEnd = () => {
            if (repeatRef.current) {
                audio.current.currentTime = 0;
                handlePlay();
            } else if ((tracksRef.current?.length || 0) > 1) {
                skipNext();
            } else {
                setIsPlaying(false);
                audio.current.currentTime = 0;
            }
        }

        audio.current.autoplay = true;
        audio.current.addEventListener('play', handlePlay);
        audio.current.addEventListener('pause', handlePause);
        audio.current.addEventListener('ended', handleEnd);
        return () => {
            audio.current.pause();
            audio.current.removeEventListener('play', handlePlay);
            audio.current.removeEventListener('pause', handlePause);
            audio.current.removeEventListener('ended', handleEnd);
        }
    }, [audio]);

    useEffect(() => {
        if (trackUrl) {
            audio.current.src = trackUrl;
        }
        document.title = currentTrack?.title ?? 'UNISON';
    }, [trackUrl]);

    useEffect(() => {
        if (isFetching) {
            audio.current.src = '';
        }
    }, [isFetching]);

    useEffect(() => {
        isPlaying ? audio.current.play() : audio.current.pause();
    }, [isPlaying]);

    const handlePlaying = async () => {
        isPlaying ? audio.current.pause() : await audio.current.play();
    }

    const handleSkipPrev = () => {
        audio.current.currentTime > 2 ? audio.current.currentTime = 0 : skipPrev();
    }

    const handleSkipNext = () => {
        skipNext();
        if (!isPlaying) {
            setIsPlaying(true);
        }
    }

    const handleToggleRepeat = () => {
        setRepeat(!repeat);
    }

    const handleShuffle = () => {
        shuffle();
    }

    return (
        <Stack>
            <Grid container justifyContent='center' alignItems='center' gap={2} marginBottom={1}>
                <button className={styles.iconBtn}
                    onClick={handleShuffle}>
                    <ShuffleRounded />
                </button>
                <button className={styles.iconBtn}
                    onClick={handleSkipPrev}>
                    <SkipPreviousRounded fontSize='large' />
                </button>
                <button className={styles.iconBtn}
                    onClick={handlePlaying}>
                    {isPlaying ? <PauseRounded fontSize='large' /> : <PlayArrowRounded fontSize='large' />}
                </button>
                <button className={styles.iconBtn}
                    onClick={handleSkipNext}>
                    <SkipNextRounded fontSize='large' />
                </button>
                <button className={styles.iconBtn}
                    onClick={handleToggleRepeat}>
                    {repeat ? <RepeatOneRounded /> : <RepeatRounded />}
                </button>
            </Grid>
            <TimeProgressBar audio={audio} />
        </Stack>
    );
});