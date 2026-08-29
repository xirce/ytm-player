import React, { useEffect, useRef } from 'react';
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { skipToken } from "@reduxjs/toolkit/query";
import { batch } from "react-redux";
import { PauseRounded, PlayArrowRounded, RepeatOneRounded, RepeatRounded, ShuffleRounded, SkipNextRounded, SkipPreviousRounded } from "@mui/icons-material";
import type { MediaPlayerClass } from 'dashjs';
import { TimeProgressBar } from './TimeProgressBar';
import { useAppAction, useAppSelector } from "../../store";
import { getCurrentTrack, getDisplayedTrack, getIsPlaying, getTracks, getRepeat, getTrackIndex } from '../../store/player';
import { useDependentRef } from "../../hooks/useDependentRef";
import styles from "./PlayerControls.module.css";
import { useGetTrackUrlQuery } from '../../apiClient';

const CROSSFADE_SECONDS = 3;

export interface TrackControlProps {
    player: MediaPlayerClass;
    standbyPlayer: MediaPlayerClass;
    swapPlayers: () => void;
    progressPlayer: MediaPlayerClass;
    canReadProgressImmediately: boolean;
    setIsCrossfading: (value: boolean) => void;
}

export const TrackControl: React.FC<TrackControlProps> = React.memo(({
    player,
    standbyPlayer,
    swapPlayers,
    progressPlayer,
    canReadProgressImmediately,
    setIsCrossfading
}) => {
    const { setIsPlaying, skipNext, skipPrev, setRepeat, shuffle, setDisplayTrackIndex } = useAppAction();
    const tracksRef = useDependentRef(useAppSelector(getTracks));
    const isPlaying = useAppSelector(getIsPlaying);
    const isPlayingRef = useDependentRef(isPlaying);
    const currentTrack = useAppSelector(getCurrentTrack);
    const displayedTrack = useAppSelector(getDisplayedTrack);
    const tracks = useAppSelector(getTracks);
    const trackIndex = useAppSelector(getTrackIndex);
    const trackIndexRef = useDependentRef(trackIndex);
    const nextTrack = tracks.length > 1
        ? tracks[trackIndex === tracks.length - 1 ? 0 : trackIndex + 1]
        : undefined;
    const repeat = useAppSelector(getRepeat);
    const repeatRef = useDependentRef(repeat);
    const initializedPlayersRef = useRef(new WeakSet<MediaPlayerClass>());
    const playerTrackIdsRef = useRef(new WeakMap<MediaPlayerClass, string>());
    const completedTransitionPlayersRef = useRef(new WeakSet<MediaPlayerClass>());
    const crossfadeRef = useRef<{ active: boolean; masterVolume: number }>({
        active: false,
        masterVolume: 1
    });
    const { data: trackUrl, isFetching } = useGetTrackUrlQuery(currentTrack?.id ?? skipToken);
    const { data: nextTrackUrl } = useGetTrackUrlQuery(nextTrack?.id ?? skipToken);


    // Обновление источника при получении манифеста
    useEffect(() => {
        if (trackUrl) {
            if (currentTrack?.id && playerTrackIdsRef.current.get(player) === currentTrack.id) return;
            initializedPlayersRef.current.delete(player);
            if (currentTrack?.id) playerTrackIdsRef.current.set(player, currentTrack.id);
            player.attachSource(trackUrl);
        }
    }, [trackUrl, player, currentTrack?.id]);

    // Резервный плеер заранее загружает манифест и начальный буфер следующего трека.
    useEffect(() => {
        if (!nextTrackUrl || !nextTrack?.id) return;
        if (playerTrackIdsRef.current.get(standbyPlayer) === nextTrack.id) return;
        initializedPlayersRef.current.delete(standbyPlayer);
        playerTrackIdsRef.current.set(standbyPlayer, nextTrack.id);
        standbyPlayer.attachSource(nextTrackUrl);
    }, [nextTrackUrl, nextTrack?.id, standbyPlayer]);

    // Очистка источника во время загрузки
    useEffect(() => {
        if (isFetching && currentTrack?.id && playerTrackIdsRef.current.get(player) !== currentTrack.id) {
            initializedPlayersRef.current.delete(player);
            player.attachSource('');
        }
    }, [isFetching, player, currentTrack?.id]);

    // Синхронизация внешнего isPlaying с плеером
    useEffect(() => {
        if (isPlaying) {
            if (initializedPlayersRef.current.has(player)) player.play();
            if (crossfadeRef.current.active && initializedPlayersRef.current.has(standbyPlayer)) {
                standbyPlayer.play();
            }
        } else if (initializedPlayersRef.current.has(player)) {
            player.pause();
            if (initializedPlayersRef.current.has(standbyPlayer)) standbyPlayer.pause();
        }
    }, [isPlaying, player, standbyPlayer]);

    // Подписка на события плеера
    useEffect(() => {
        const onStreamInitialized = () => {
            initializedPlayersRef.current.add(player);
            if (isPlayingRef.current) player.play();
        };
        const getFollowingTrack = () => {
            const currentTracks = tracksRef.current;
            const currentIndex = trackIndexRef.current;
            return currentTracks[currentIndex === currentTracks.length - 1 ? 0 : currentIndex + 1];
        };
        const isFollowingTrackPrepared = () => {
            const followingTrack = getFollowingTrack();
            return Boolean(followingTrack
                && playerTrackIdsRef.current.get(standbyPlayer) === followingTrack.id
                && initializedPlayersRef.current.has(standbyPlayer));
        };
        const finishCrossfade = () => {
            if (!crossfadeRef.current.active) return false;
            crossfadeRef.current.active = false;
            const masterVolume = crossfadeRef.current.masterVolume;
            completedTransitionPlayersRef.current.add(player);
            player.setVolume(masterVolume);
            standbyPlayer.setVolume(masterVolume);
            // dash.js emits events outside React. Without batching, Redux can update
            // the track before React swaps the players (or vice versa), and the
            // preloading effect attaches a new source to the already playing player.
            batch(() => {
                setIsCrossfading(false);
                swapPlayers();
                skipNext();
            });
            return true;
        };
        const onTimeUpdated = (event: { timeToEnd?: number }) => {
            if (completedTransitionPlayersRef.current.has(player)) return;
            const timeToEnd = event.timeToEnd;
            if (repeatRef.current || !isPlayingRef.current || typeof timeToEnd !== 'number') return;
            if ((tracksRef.current?.length || 0) < 2 || player.time() < CROSSFADE_SECONDS) return;

            if (!crossfadeRef.current.active) {
                if (timeToEnd > CROSSFADE_SECONDS || !isFollowingTrackPrepared()) return;
                crossfadeRef.current = { active: true, masterVolume: player.getVolume() };
                standbyPlayer.setMute(player.isMuted());
                standbyPlayer.setVolume(0);
                standbyPlayer.play();
                const currentIndex = trackIndexRef.current;
                const trackCount = tracksRef.current.length;
                setDisplayTrackIndex(currentIndex === trackCount - 1 ? 0 : currentIndex + 1);
                setIsCrossfading(true);
            }

            const progress = Math.min(1, Math.max(0, (CROSSFADE_SECONDS - timeToEnd) / CROSSFADE_SECONDS));
            const masterVolume = crossfadeRef.current.masterVolume;
            player.setVolume(masterVolume * (1 - progress));
            standbyPlayer.setVolume(masterVolume * progress);
        };
        const onEnded = () => {
            if (completedTransitionPlayersRef.current.has(player)) return;
            if (finishCrossfade()) return;
            if (repeatRef.current) {
                player.seek(0);
                player.play();
            } else if ((tracksRef.current?.length || 0) > 1) {
                if (isFollowingTrackPrepared()) {
                    standbyPlayer.setVolume(player.getVolume());
                    standbyPlayer.setMute(player.isMuted());
                    standbyPlayer.play();
                    batch(() => {
                        setIsCrossfading(false);
                        swapPlayers();
                        skipNext();
                    });
                    return;
                }
                skipNext();
            } else {
                setIsPlaying(false);
                player.seek(0);
            }
        };

        // Используем строковые имена событий, без импорта констант
        player.on('streamInitialized', onStreamInitialized);
        player.on('playbackEnded', onEnded);
        player.on('playbackTimeUpdated', onTimeUpdated);

        return () => {
            player.off('streamInitialized', onStreamInitialized);
            player.off('playbackEnded', onEnded);
            player.off('playbackTimeUpdated', onTimeUpdated);
        };
    }, [player, standbyPlayer, repeatRef, tracksRef, trackIndexRef, isPlayingRef, skipNext, setIsPlaying, swapPlayers, setIsCrossfading, setDisplayTrackIndex]);

    useEffect(() => {
        // Плеер снова стал активным с новым треком — старый маркер ended ему больше не нужен.
        completedTransitionPlayersRef.current.delete(player);
    }, [player]);

    useEffect(() => {
        const onStandbyInitialized = () => initializedPlayersRef.current.add(standbyPlayer);
        standbyPlayer.on('streamInitialized', onStandbyInitialized);
        return () => standbyPlayer.off('streamInitialized', onStandbyInitialized);
    }, [standbyPlayer]);

    useEffect(() => {
        document.title = currentTrack?.title ?? 'UNISON';
    }, [currentTrack]);

    const cancelCrossfade = () => {
        if (!crossfadeRef.current.active) return;
        crossfadeRef.current.active = false;
        setDisplayTrackIndex(null);
        setIsCrossfading(false);
        player.setVolume(crossfadeRef.current.masterVolume);
        standbyPlayer.pause();
        standbyPlayer.seek(0);
        standbyPlayer.setVolume(crossfadeRef.current.masterVolume);
    };

    const handlePlaying = () => {
        if (isPlaying) {
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
        }
    };

    const handleSkipPrev = () => {
        cancelCrossfade();
        const currentTime = player.time() || 0;
        if (currentTime > 2) {
            player.seek(0);
        } else {
            skipPrev();
        }
    };

    const handleSkipNext = () => {
        cancelCrossfade();
        skipNext();
        if (!isPlaying) setIsPlaying(true);
    };

    const handleToggleRepeat = () => {
        cancelCrossfade();
        setRepeat(!repeat);
    };
    const handleShuffle = () => {
        cancelCrossfade();
        shuffle();
    };

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = displayedTrack
            ? new MediaMetadata({
                title: displayedTrack.title,
                artist: displayedTrack.artist?.name ?? '',
                album: displayedTrack.album?.name ?? '',
                artwork: displayedTrack.imageUrl
                    ? [{ src: displayedTrack.imageUrl }]
                    : []
            })
            : null;
        navigator.mediaSession.playbackState = displayedTrack
            ? (isPlaying ? 'playing' : 'paused')
            : 'none';
    }, [displayedTrack, isPlaying]);

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        const seekBy = (offset: number) => {
            try {
                const duration = progressPlayer.duration();
                const position = progressPlayer.time();
                progressPlayer.seek(Math.min(duration, Math.max(0, position + offset)));
            } catch {
                // Ignore a command received while dash.js is switching sources.
            }
        };
        const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
            play: () => setIsPlaying(true),
            pause: () => setIsPlaying(false),
            stop: () => {
                cancelCrossfade();
                setIsPlaying(false);
                player.seek(0);
            },
            nexttrack: handleSkipNext,
            previoustrack: handleSkipPrev,
            seekbackward: details => seekBy(-(details.seekOffset ?? 10)),
            seekforward: details => seekBy(details.seekOffset ?? 10),
            seekto: details => {
                if (typeof details.seekTime !== 'number') return;
                try {
                    progressPlayer.seek(details.seekTime);
                } catch {
                    // Ignore a command received while dash.js is switching sources.
                }
            }
        };

        Object.entries(handlers).forEach(([action, handler]) => {
            try {
                navigator.mediaSession.setActionHandler(action as MediaSessionAction, handler ?? null);
            } catch {
                // Some browsers expose Media Session but support only part of its actions.
            }
        });

        return () => {
            Object.keys(handlers).forEach(action => {
                try {
                    navigator.mediaSession.setActionHandler(action as MediaSessionAction, null);
                } catch {
                    // Ignore unsupported actions during cleanup as well.
                }
            });
        };
    }, [progressPlayer, player, isPlaying, setIsPlaying, skipNext, skipPrev]);

    useEffect(() => {
        if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

        const updatePositionState = () => {
            try {
                const duration = progressPlayer.duration();
                const position = progressPlayer.time();
                if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return;
                navigator.mediaSession.setPositionState({
                    duration,
                    playbackRate: 1,
                    position: Math.min(duration, Math.max(0, position))
                });
            } catch {
                // The player can briefly lose its source while tracks are switched.
            }
        };

        progressPlayer.on('playbackTimeUpdated', updatePositionState);
        progressPlayer.on('playbackMetadataLoaded', updatePositionState);
        return () => {
            progressPlayer.off('playbackTimeUpdated', updatePositionState);
            progressPlayer.off('playbackMetadataLoaded', updatePositionState);
        };
    }, [progressPlayer]);

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
            <TimeProgressBar
                player={progressPlayer}
                canReadImmediately={canReadProgressImmediately}
            />
        </Stack>
    );
});
