import React, { MouseEventHandler, useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid';
import { MediaPlayer, MediaPlayerClass } from 'dashjs';
import { useReferredState } from '../../hooks/useReferredState';
import { formatSeconds } from '../../utils/formatting';
import { SliderWrapper } from '../Slider/SliderWrapper';

export interface ITimeProgressBarProps {
    player: MediaPlayerClass;
}

export const TimeProgressBar: React.FC<ITimeProgressBarProps> = React.memo(({ player }) => {
    const [currentTimeRef, setCurrentTimeRef] = useReferredState(0);
    const [isChangingTimeRef, setIsChangingTimeRef] = useReferredState(false);
    const [duration, setDuration] = useState(0);

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
        const onTimeUpdate = () => {
            if (isChangingTimeRef.current) return;
            const time = player.time() || 0;
            setCurrentTimeRef(time);
            // Обновляем duration при первом получении
            if (duration === 0) {
                const dur = player.duration() || 0;
                setDuration(dur);
            }
        };

        const onMetadataLoaded = () => {
            const dur = player.duration() || 0;
            setDuration(dur);
        };

        player.on(MediaPlayer.events.PLAYBACK_TIME_UPDATED, onTimeUpdate);
        player.on(MediaPlayer.events.PLAYBACK_METADATA_LOADED, onMetadataLoaded);

        return () => {
            player.off(MediaPlayer.events.PLAYBACK_TIME_UPDATED, onTimeUpdate);
            player.off(MediaPlayer.events.PLAYBACK_METADATA_LOADED, onMetadataLoaded);
        };
    }, [player]);

    useEffect(() => {
        const handleMouseUp = () => {
            if (!isChangingTimeRef.current) return;
            setIsChangingTimeRef(false);
            player.seek(currentTimeRef.current as number);
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isChangingTimeRef, player, currentTimeRef]);

    const changeCurrentTime = (event: Event, value: number) => {
        setCurrentTimeRef(value * duration);
    };

    const handleMouseDown: MouseEventHandler = () => {
        setIsChangingTimeRef(true);
    };

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
