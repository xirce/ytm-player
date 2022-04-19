import Grid from '@mui/material/Grid';
import React, {MouseEventHandler, MutableRefObject, useState, useEffect, useMemo} from 'react';
import {useReferredState} from '../../hooks/useReferredState';
import {formatSeconds} from '../../utils/formatting';
import {SliderWrapper} from '../Slider/SliderWrapper';

export interface ITimeProgressBarProps {
    audio: MutableRefObject<HTMLAudioElement>;
}

export const TimeProgressBar: React.FC<ITimeProgressBarProps> = ({audio}) => {
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

        const handleTimeUpdate = (event: Event) => {
            if (isChangingTimeRef.current) return;

            const audioElement = event.target as HTMLAudioElement;
            setCurrentTime(audioElement?.currentTime);
        }

        audio.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.current.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            audio.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.current.removeEventListener('timeupdate', handleTimeUpdate);
        }
    });

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

    return (
        <Grid container
              justifyContent='space-between'
              alignItems='center'
              direction='row'
              gap={1}
              fontSize='small'
        >
            <Grid item><span>{formattedCurrentTime}</span></Grid>
            <Grid container item xs>
                <SliderWrapper
                    value={sliderValue}
                    onChange={changeCurrentTime}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}/>
            </Grid>
            <Grid item><span>{formattedDuration}</span></Grid>
        </Grid>
    );
}