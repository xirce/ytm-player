import React, {MouseEventHandler, MutableRefObject, useContext, useEffect, useState} from 'react';
import Grid from "@mui/material/Grid";
import classNames from "classnames";
import {PauseRounded, PlayArrowRounded, SkipNextRounded, SkipPreviousRounded} from "@mui/icons-material";
import Box from "@mui/material/Box";
import {formatSeconds} from "../../utils/formatting";
import {SliderWrapper} from "../Slider/SliderWrapper";
import Stack from "@mui/material/Stack";
import {PlayerContext} from "../../context/PlayerContext/PlayerContext";
import {useReferredState} from "../../hooks/useReferredState";
import styles from "./PlayerControls.module.css";
import {initTracks} from '../../hardCodedTracks/tracks';

export interface TrackControlProps {
    audio: MutableRefObject<HTMLAudioElement>;
}

export const TrackControl: React.FC<TrackControlProps> = ({audio}) => {
    const {tracks, trackIndex, isPlaying, setIsPlaying, skipPrev, skipNext, setTracks} = useContext(PlayerContext);
    const [currentTime, setCurrentTime] = useState(audio.current.currentTime || 0);
    const [duration, setDuration] = useState(audio.current.duration || 0);
    const [isChangingTimeRef, setIsChangingTimeRef] = useReferredState(false);

    useEffect(() => {
        setTracks(initTracks);

        audio.current.autoplay = true;
        audio.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.current.addEventListener('timeupdate', handleTimeUpdate);
        audio.current.addEventListener('ended', handleEnd);
        return () => {
            audio.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.current.removeEventListener('timeupdate', handleTimeUpdate);
            audio.current.removeEventListener('ended', handleEnd);
        }
    }, [audio.current]);

    useEffect(() => {
        audio.current.src = tracks[trackIndex]?.url;
    }, [tracks, trackIndex]);

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

        setIsPlaying(!isPlaying);
    }

    const handleLoadedMetadata = (event: Event) => {
        const audioElement = event.target as HTMLAudioElement;
        const dur = audioElement?.duration ?? 0;
        setDuration(dur);
    }

    const handleTimeUpdate = (event: Event) => {
        if (isChangingTimeRef.current) return;

        const audioElement = event.target as HTMLAudioElement;
        setCurrentTime(audioElement?.currentTime);
    }

    const handleSkipPrev = () => {
        currentTime > 2 ? audio.current.currentTime = 0 : skipPrev();
    }

    const handleEnd = (event: Event) => {
        skipNext();
        if (!isPlaying) {
            setIsPlaying(true);
        }
    }

    return (<Stack>
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
                    onClick={skipNext}>
                <SkipNextRounded fontSize='large'/>
            </button>
        </Grid>
        <Grid container
              justifyContent='space-between'
              alignItems='center'
              direction='row'
              gap={1}
              fontSize='small'>
            <Grid item><Box>{formatSeconds(currentTime)}</Box></Grid>
            <Grid container item xs>
                <SliderWrapper
                    value={isNaN(currentTime / duration) ? 0 : currentTime / duration}
                    onChange={changeCurrentTime}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}/>
            </Grid>
            <Grid item><Box>{formatSeconds(duration)}</Box></Grid>
        </Grid>
    </Stack>);
};