import React, {MouseEventHandler, MutableRefObject, useContext, useEffect, useMemo, useState} from 'react';
import Grid from "@mui/material/Grid";
import classNames from "classnames";
import {PauseRounded, PlayArrowRounded, SkipNextRounded, SkipPreviousRounded} from "@mui/icons-material";
import Stack from "@mui/material/Stack";
import {usePlayerContext} from "../../context/PlayerContext/PlayerContext";
import styles from "./PlayerControls.module.css";
import {TimeProgressBar} from './TimeProgressBar';

export interface TrackControlProps {
    audio: MutableRefObject<HTMLAudioElement>;
}

export const TrackControl: React.FC<TrackControlProps> = ({audio}) => {
    const {tracks, trackIndex, isPlaying, setIsPlaying, skipPrev, skipNext} = usePlayerContext();

    useEffect(() => {
        const handlePlay = () => {
            setIsPlaying(true);
        }

        const handlePause = () => {
            setIsPlaying(false);
        }

        const handleEnd = async () => {
            if (trackIndex + 1 >= tracks.length) {
                setIsPlaying(false);
                audio.current.currentTime = 0;
            } else {
                skipNext();
                if (!isPlaying) {
                    setIsPlaying(true);
                }
            }
        }

        audio.current.autoplay = true;
        audio.current.addEventListener('play', handlePlay);
        audio.current.addEventListener('pause', handlePause);
        audio.current.addEventListener('ended', handleEnd);
        return () => {
            audio.current.removeEventListener('play', handlePlay);
            audio.current.removeEventListener('pause', handlePause);
            audio.current.removeEventListener('ended', handleEnd);
            audio.current.pause();
        }
    }, [audio.current]);

    useEffect(() => {
        audio.current.src = tracks[trackIndex]?.url;
        document.title = tracks[trackIndex]?.title ?? 'Слава Украине';
    }, [tracks[trackIndex]]);

    const handlePlaying = async () => {
        isPlaying ? audio.current.pause() : await audio.current.play();
    }

    const handleSkipPrev = () => {
        audio.current.currentTime > 2 ? audio.current.currentTime = 0 : skipPrev();
    }

    const handleSkipNext = () => {
        skipNext();
    }

    return (
        <Stack>
            <Grid container justifyContent='center' alignItems='center' gap={2} marginBottom={1}>
                <button className={classNames(styles.btn, styles.iconBtn)}
                        onClick={handleSkipPrev}>
                    <SkipPreviousRounded fontSize='large'/>
                </button>
                <button className={styles.btn}
                        onClick={handlePlaying}>
                    {isPlaying ? <PauseRounded/> : <PlayArrowRounded/>}
                </button>
                <button className={classNames(styles.btn, styles.iconBtn)}
                        onClick={handleSkipNext}>
                    <SkipNextRounded fontSize='large'/>
                </button>
            </Grid>
            <TimeProgressBar audio={audio}/>
        </Stack>);
};