import React, {MouseEventHandler, MutableRefObject, useContext, useEffect, useMemo, useState} from 'react';
import Grid from "@mui/material/Grid";
import classNames from "classnames";
import {PauseRounded, PlayArrowRounded, SkipNextRounded, SkipPreviousRounded} from "@mui/icons-material";
import Box from "@mui/material/Box";
import {formatSeconds} from "../../utils/formatting";
import {SliderWrapper} from "../Slider/SliderWrapper";
import Stack from "@mui/material/Stack";
import {usePlayerContext} from "../../context/PlayerContext/PlayerContext";
import {useReferredState} from "../../hooks/useReferredState";
import styles from "./PlayerControls.module.css";

export interface TrackControlProps {
    audio: MutableRefObject<HTMLAudioElement>;
}

export const TrackControl: React.FC<TrackControlProps> = ({audio}) => {
    const {tracks, trackIndex, isPlaying, setIsPlaying, skipPrev, skipNext} = usePlayerContext();
    const [currentTime, setCurrentTime] = useState(audio.current.currentTime || 0);
    const [duration, setDuration] = useState(audio.current.duration || 0);
    const [isChangingTimeRef, setIsChangingTimeRef] = useReferredState(false);

    const formattedCurrentTime = useMemo(() => {
        return formatSeconds(currentTime);
    }, [currentTime]);

    const formattedDuration = useMemo(() => {
        return formatSeconds(duration);
    }, [duration]);

    const sliderValue = useMemo(() => {
        const currentValue = currentTime / duration;
        return isNaN(currentValue) ? 0 : currentValue;
    }, [currentTime, duration]);

    useEffect(() => {
        const handleLoadedMetadata = async (event: Event) => {
            const audioElement = event.target as HTMLAudioElement;
            const dur = audioElement?.duration ?? 0;
            setDuration(dur);
        }

        const handlePlay = () => {
            setIsPlaying(true);
        }

        const handlePause = () => {
            setIsPlaying(false);
        }

        const handleTimeUpdate = (event: Event) => {
            if (isChangingTimeRef.current) return;

            const audioElement = event.target as HTMLAudioElement;
            setCurrentTime(audioElement?.currentTime);
        }

        const handleEnd = async () => {
            if (tracks.length == 1) {
                setIsPlaying(false);
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
        audio.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.current.addEventListener('timeupdate', handleTimeUpdate);
        audio.current.addEventListener('ended', handleEnd);
        return () => {
            audio.current.removeEventListener('play', handlePlay);
            audio.current.removeEventListener('pause', handlePause);
            audio.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.current.removeEventListener('timeupdate', handleTimeUpdate);
            audio.current.removeEventListener('ended', handleEnd);
        }
    }, [audio.current]);

    useEffect(() => {
        audio.current.src = tracks[trackIndex]?.url;
    }, [tracks[trackIndex]]);

    const changeCurrentTime = (event: Event, value: number) => {
        setCurrentTime(value * duration);
    }

    const handleMouseDown: MouseEventHandler = _ => {
        setIsChangingTimeRef(true);
    }

    const handleMouseUp: MouseEventHandler = _ => {
        setIsChangingTimeRef(false);
        audio.current.currentTime = currentTime;
    }

    const handlePlaying = async () => {
        isPlaying ? audio.current.pause() : await audio.current.play();
    }

    const handleSkipPrev = () => {
        currentTime > 2 ? audio.current.currentTime = 0 : skipPrev();
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
            <Grid container
                  justifyContent='space-between'
                  alignItems='center'
                  direction='row'
                  gap={1}
                  fontSize='small'
            >
                <Grid item><Box>{formattedCurrentTime}</Box></Grid>
                <Grid container item xs>
                    <SliderWrapper
                        value={sliderValue}
                        onChange={changeCurrentTime}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}/>
                </Grid>
                <Grid item><Box>{formattedDuration}</Box></Grid>
            </Grid>
        </Stack>);
};