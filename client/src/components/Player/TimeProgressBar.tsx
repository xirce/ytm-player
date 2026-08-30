import React, { MouseEventHandler, useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid';
import { MediaPlayer, MediaPlayerClass } from 'dashjs';
import { useReferredState } from '../../hooks/useReferredState';
import { formatSeconds } from '../../utils/formatting';
import { SliderWrapper } from '../Slider/SliderWrapper';
import { loadPlayerProgress } from '../../utils/playerPersistence';

export interface ITimeProgressBarProps {
    player: MediaPlayerClass;
    canReadImmediately?: boolean;
    trackId?: string;
    fallbackDuration?: number | null;
}

export const TimeProgressBar: React.FC<ITimeProgressBarProps> = React.memo(({
    player,
    canReadImmediately = false,
    trackId,
    fallbackDuration
}) => {
    const cachedProgress = loadPlayerProgress();
    const cachedForInitialTrack = cachedProgress?.trackId === trackId ? cachedProgress : undefined;
    const initialPosition = cachedForInitialTrack?.position ?? 0;
    const initialDuration = cachedForInitialTrack
        ? cachedForInitialTrack.duration ?? fallbackDuration ?? 0
        : fallbackDuration ?? 0;
    const [currentTimeRef, setCurrentTimeRef] = useReferredState(initialPosition);
    const [isChangingTimeRef, setIsChangingTimeRef] = useReferredState(false);
    const [duration, setDuration] = useState(initialDuration);

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

    const commitCurrentTime = (_event: Event | React.SyntheticEvent, value: number) => {
        const position = value * duration;
        setCurrentTimeRef(position);
        setIsChangingTimeRef(false);
        player.seek(position);
    };

    const handleMouseDown: MouseEventHandler = () => {
        setIsChangingTimeRef(true);
    };

    useEffect(() => {
        // A newly displayed dash.js instance may already have a source attached,
        // but still be between source attachment and stream initialization.
        // Reading time/duration in that window throws; player events fill these
        // values as soon as the stream is ready.
        const cached = loadPlayerProgress();
        const cachedForTrack = cached?.trackId === trackId ? cached : undefined;
        setCurrentTimeRef(canReadImmediately
            ? player.time() || cachedForTrack?.position || 0
            : cachedForTrack?.position || 0);
        setDuration(canReadImmediately
            ? player.duration() || cachedForTrack?.duration || fallbackDuration || 0
            : cachedForTrack?.duration || fallbackDuration || 0);
        // Finishing a crossfade changes canReadImmediately, but keeps the same
        // player. Resetting on that flag change would erase the known duration.
    }, [player, trackId]);

    return (
        <Grid container
            justifyContent='space-between'
            alignItems='center'
            direction='row'
            gap={1}
            fontSize='small'
            width='100%'
            minWidth={0}
        >
            <Grid item><span>{formattedCurrentTime}</span></Grid>
            <Grid container item xs minWidth={0}>
                <SliderWrapper
                    value={sliderValue}
                    onChange={changeCurrentTime}
                    onChangeCommitted={commitCurrentTime}
                    onMouseDown={handleMouseDown}
                />
            </Grid>
            <Grid item><span>{formattedDuration}</span></Grid>
        </Grid>
    );
});
