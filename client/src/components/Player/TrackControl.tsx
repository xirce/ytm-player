import React, { useEffect, useRef } from 'react';
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { skipToken } from "@reduxjs/toolkit/query";
import { PauseRounded, PlayArrowRounded, RepeatOneRounded, RepeatRounded, ShuffleRounded, SkipNextRounded, SkipPreviousRounded } from "@mui/icons-material";
import type { MediaPlayerClass } from 'dashjs';
import { TimeProgressBar } from './TimeProgressBar';
import { useAppAction, useAppSelector } from "../../store";
import { getCurrentTrack, getIsPlaying, getTracks, getRepeat } from '../../store/player';
import { useDependentRef } from "../../hooks/useDependentRef";
import styles from "./PlayerControls.module.css";
import { useGetTrackUrlQuery } from '../../apiClient';

export interface TrackControlProps {
    player: MediaPlayerClass;
}

export const TrackControl: React.FC<TrackControlProps> = React.memo(({ player }) => {
    const { setIsPlaying, skipNext, skipPrev, setRepeat, shuffle } = useAppAction();
    const tracksRef = useDependentRef(useAppSelector(getTracks));
    const isPlaying = useAppSelector(getIsPlaying);
    const isPlayingRef = useDependentRef(isPlaying);
    const currentTrack = useAppSelector(getCurrentTrack);
    const repeat = useAppSelector(getRepeat);
    const repeatRef = useDependentRef(repeat);
    const isStreamInitializedRef = useRef(false);
    const { data: trackUrl, isFetching } = useGetTrackUrlQuery(currentTrack?.id ?? skipToken);


    // Обновление источника при получении манифеста
    useEffect(() => {
        if (trackUrl) {
            isStreamInitializedRef.current = false;
            player.attachSource(trackUrl);
        }
    }, [trackUrl, player]);

    // Очистка источника во время загрузки
    useEffect(() => {
        if (isFetching) {
            isStreamInitializedRef.current = false;
            player.attachSource('');
        }
    }, [isFetching, player]);

    // Синхронизация внешнего isPlaying с плеером
    useEffect(() => {
        if (isPlaying) {
            if (isStreamInitializedRef.current) player.play();
        } else if (isStreamInitializedRef.current) {
            player.pause();
        }
    }, [isPlaying, player]);

    // Подписка на события плеера
    useEffect(() => {
        const onPlaying = () => setIsPlaying(true);
        const onPaused = () => setIsPlaying(false);
        const onStreamInitialized = () => {
            isStreamInitializedRef.current = true;
            if (isPlayingRef.current) player.play();
        };
        const onEnded = () => {
            if (repeatRef.current) {
                player.seek(0);
                player.play();
            } else if ((tracksRef.current?.length || 0) > 1) {
                skipNext();
            } else {
                setIsPlaying(false);
                player.seek(0);
            }
        };

        // Используем строковые имена событий, без импорта констант
        player.on('streamInitialized', onStreamInitialized);
        player.on('playbackPlaying', onPlaying);
        player.on('playbackPaused', onPaused);
        player.on('playbackEnded', onEnded);

        return () => {
            player.off('streamInitialized', onStreamInitialized);
            player.off('playbackPlaying', onPlaying);
            player.off('playbackPaused', onPaused);
            player.off('playbackEnded', onEnded);
        };
    }, [player, repeatRef, tracksRef, isPlayingRef, skipNext, setIsPlaying]);

    useEffect(() => {
        document.title = currentTrack?.title ?? 'UNISON';
    }, [currentTrack]);

    const handlePlaying = () => {
        if (isPlaying) {
            if (isStreamInitializedRef.current) player.pause();
        } else {
            setIsPlaying(true);
            if (isStreamInitializedRef.current) player.play();
        }
    };

    const handleSkipPrev = () => {
        const currentTime = player.time() || 0;
        if (currentTime > 2) {
            player.seek(0);
        } else {
            skipPrev();
        }
    };

    const handleSkipNext = () => {
        skipNext();
        if (!isPlaying) setIsPlaying(true);
    };

    const handleToggleRepeat = () => setRepeat(!repeat);
    const handleShuffle = () => shuffle();

    return (
        <Stack>
            <Grid container justifyContent="center" alignItems="center" gap={2} marginBottom={1}>
                <button className={styles.iconBtn} onClick={handleShuffle}>
                    <ShuffleRounded />
                </button>
                <button className={styles.iconBtn} onClick={handleSkipPrev}>
                    <SkipPreviousRounded fontSize="large" />
                </button>
                <button className={styles.iconBtn} onClick={handlePlaying}>
                    {isPlaying ? <PauseRounded fontSize="large" /> : <PlayArrowRounded fontSize="large" />}
                </button>
                <button className={styles.iconBtn} onClick={handleSkipNext}>
                    <SkipNextRounded fontSize="large" />
                </button>
                <button className={styles.iconBtn} onClick={handleToggleRepeat}>
                    {repeat ? <RepeatOneRounded /> : <RepeatRounded />}
                </button>
            </Grid>
            <TimeProgressBar player={player} />
        </Stack>
    );
});
