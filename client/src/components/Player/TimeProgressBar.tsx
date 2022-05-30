import React, { MouseEventHandler, MutableRefObject, useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid';
import { useReferredState } from '../../hooks/useReferredState';
import { formatSeconds } from '../../utils/formatting';
import { SliderWrapper } from '../Slider/SliderWrapper';

export interface ITimeProgressBarProps {
    audio: MutableRefObject<HTMLAudioElement>;
}

export const TimeProgressBar: React.FC<ITimeProgressBarProps> = React.memo(({ audio }) => {
    const [currentTimeRef, setCurrentTimeRef] = useReferredState(audio.current.currentTime || 0);
    const [isChangingTimeRef, setIsChangingTimeRef] = useReferredState(false);
    const [duration, setDuration] = useState(audio.current.duration || 0);

    const formattedCurrentTime = useMemo(() => {
        return formatSeconds(currentTimeRef.current as number);
    }, [currentTimeRef.current]);

    const formattedDuration = useMemo(() => {
        return formatSeconds(duration);
    }, [duration]);

    const sliderValue = useMemo(() => {
        const currentValue = (currentTimeRef.current as number) / duration;
        return isNaN(currentValue) ? 0 : currentValue;
    }, [currentTimeRef.current, duration]);

    useEffect(() => {
        const handleLoadedMetadata = async (event: Event) => {
            const audioElement = event.target as HTMLAudioElement;
            const duration = audioElement?.duration ?? 0;
            setDuration(duration);
        }

        const handleTimeUpdate = (event: Event) => {
            if (isChangingTimeRef.current) return;

            const audioElement = event.target as HTMLAudioElement;
            setCurrentTimeRef(audioElement?.currentTime);
        }

        const handleMouseUp = () => {
            if (!isChangingTimeRef.current) return;

            setIsChangingTimeRef(false);
            audio.current.currentTime = currentTimeRef.current as number;
        }

        audio.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.current.addEventListener('timeupdate', handleTimeUpdate);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            audio.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.current.removeEventListener('timeupdate', handleTimeUpdate);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }, []);

    const changeCurrentTime = (event: Event, value: number) => {
        setCurrentTimeRef(value * duration);
    }

    const handleMouseDown: MouseEventHandler = _ => {
        setIsChangingTimeRef(true);
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
                />
            </Grid>
            <Grid item><span>{formattedDuration}</span></Grid>
        </Grid>
    );
});