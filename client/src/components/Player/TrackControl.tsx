import React, { MutableRefObject, useEffect, useRef } from 'react';
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { PauseRounded, PlayArrowRounded, SkipNextRounded, SkipPreviousRounded } from "@mui/icons-material";
import cx from "classnames";
import { TimeProgressBar } from './TimeProgressBar';
import { useAppAction, useAppSelector } from "../../store";
import {
    getCurrentTrack,
    getIsPlaying, getTracks
} from '../../store/player';
import { getTrackUrl } from '../../apiClient';
import styles from "./PlayerControls.module.css";
import { useDependentRef } from "../../hooks/useDependentRef";

export interface TrackControlProps {
    audio: MutableRefObject<HTMLAudioElement>;
}

export const TrackControl: React.FC<TrackControlProps> = ({ audio }) => {
    const { setIsPlaying, skipNext, skipPrev } = useAppAction();
    const tracksRef = useDependentRef(useAppSelector(getTracks));
    const isPlaying = useAppSelector(getIsPlaying);
    const currentTrack = useAppSelector(getCurrentTrack);

    useEffect(() => {
        const handlePlay = () => {
            setIsPlaying(true);
        }

        const handlePause = () => {
            setIsPlaying(false);
        }

        const handleEnd = () => {
            if ((tracksRef.current?.length || 0) > 1) {
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
    }, []);

    useEffect(() => {
        if (currentTrack) {
            getTrackUrl(currentTrack?.id).then(({ data }) => {
                audio.current.src = data;
                document.title = currentTrack?.title ?? 'UNISON';
            });
        }
    }, [currentTrack]);

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

    return (
        <Stack>
            <Grid container justifyContent='center' alignItems='center' gap={2} marginBottom={1}>
                <button className={cx(styles.btn, styles.iconBtn)}
                        onClick={handleSkipPrev}>
                    <SkipPreviousRounded fontSize='large'/>
                </button>
                <button className={styles.btn}
                        onClick={handlePlaying}>
                    {isPlaying ? <PauseRounded/> : <PlayArrowRounded/>}
                </button>
                <button className={cx(styles.btn, styles.iconBtn)}
                        onClick={handleSkipNext}>
                    <SkipNextRounded fontSize='large'/>
                </button>
            </Grid>
            <TimeProgressBar audio={audio}/>
        </Stack>
    );
};