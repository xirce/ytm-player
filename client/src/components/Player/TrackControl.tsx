import React, { useEffect, useRef } from 'react';
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { skipToken } from "@reduxjs/toolkit/query";
import { batch } from "react-redux";
import { PauseRounded, PlayArrowRounded, RepeatOneRounded, RepeatRounded, ShuffleRounded, SkipNextRounded, SkipPreviousRounded } from "@mui/icons-material";
import type { MediaPlayerClass } from 'dashjs';
import { TimeProgressBar } from './TimeProgressBar';
import { useAppAction, useAppSelector } from "../../store";
import { getAutoplay, getCurrentTrack, getDisplayedTrack, getIsPlaying, getTracks, getRepeat, getTrackIndex } from '../../store/player';
import { useDependentRef } from "../../hooks/useDependentRef";
import styles from "./PlayerControls.module.css";
import { useAddTrackToHistoryMutation, useGetTrackUrlQuery, useLazyGetRadioQuery } from '../../apiClient';
import { loadPlayerProgress, savePlayerProgress } from '../../utils/playerPersistence';

const CROSSFADE_SECONDS = 3;

const isIOSDevice = () => {
    const navigatorWithTouchPoints = navigator as Navigator & { maxTouchPoints?: number };
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && (navigatorWithTouchPoints.maxTouchPoints || 0) > 1);
};

const supportsDualPlayerCrossfade = () => !isIOSDevice();

export interface TrackControlProps {
    player: MediaPlayerClass;
    standbyPlayer: MediaPlayerClass;
    swapPlayers: () => void;
    progressPlayer: MediaPlayerClass;
    canReadProgressImmediately: boolean;
}

export const TrackControl: React.FC<TrackControlProps> = React.memo(({
    player,
    standbyPlayer,
    swapPlayers,
    progressPlayer,
    canReadProgressImmediately
}) => {
    const {
        setIsPlaying, skipNext, skipPrev, setRepeat, shuffle, setDisplayTrackIndex,
        appendTracks, setAutoplaySource, updateTrackDuration
    } = useAppAction();
    const tracksRef = useDependentRef(useAppSelector(getTracks));
    const isPlaying = useAppSelector(getIsPlaying);
    const isPlayingRef = useDependentRef(isPlaying);
    const currentTrack = useAppSelector(getCurrentTrack);
    const displayedTrack = useAppSelector(getDisplayedTrack);
    const tracks = useAppSelector(getTracks);
    const trackIndex = useAppSelector(getTrackIndex);
    const trackIndexRef = useDependentRef(trackIndex);
    const nextTrack = tracks[trackIndex + 1];
    const autoplay = useAppSelector(getAutoplay);
    const autoplayRef = useDependentRef(autoplay);
    const repeat = useAppSelector(getRepeat);
    const repeatRef = useDependentRef(repeat);
    const initializedPlayersRef = useRef(new WeakSet<MediaPlayerClass>());
    const playerTrackIdsRef = useRef(new WeakMap<MediaPlayerClass, string>());
    const completedTransitionPlayersRef = useRef(new WeakSet<MediaPlayerClass>());
    const historyRecordedPlayersRef = useRef(new WeakSet<MediaPlayerClass>());
    const restoredProgressPlayersRef = useRef(new WeakSet<MediaPlayerClass>());
    const lastProgressSaveRef = useRef(0);
    const requestedRadioSeedsRef = useRef(new Set<string>());
    const autoplayWaitingRef = useRef(false);
    const crossfadeRef = useRef<{ active: boolean; masterVolume: number }>({
        active: false,
        masterVolume: 1
    });
    const dualPlayerCrossfadeRef = useRef(supportsDualPlayerCrossfade());
    // `data` keeps the previous argument's result while a new request is loading.
    // Attaching it would restart the old track and incorrectly associate its URL
    // with the newly selected track. `currentData` is scoped to the current ID.
    const { currentData: trackUrl, isFetching } = useGetTrackUrlQuery(currentTrack?.id ?? skipToken);
    const { currentData: nextTrackUrl } = useGetTrackUrlQuery(nextTrack?.id ?? skipToken);
    const [addTrackToHistory] = useAddTrackToHistoryMutation();
    const [loadRadio] = useLazyGetRadioQuery();

    useEffect(() => {
        if (!autoplay) {
            requestedRadioSeedsRef.current.clear();
            return;
        }
        if (!isPlaying || !tracks.length || tracks.length - trackIndex > 2) return;

        const seed = tracks[tracks.length - 1];
        if (!seed?.radioId || requestedRadioSeedsRef.current.has(seed.id)) return;
        requestedRadioSeedsRef.current.add(seed.id);

        void loadRadio(seed.radioId)
            .unwrap()
            .then(radioTracks => {
                if (!autoplayRef.current) {
                    autoplayWaitingRef.current = false;
                    return;
                }
                const knownIds = new Set(tracksRef.current.map(track => track.id));
                const newTracks = radioTracks.filter(track => track.id && !knownIds.has(track.id));
                if (!newTracks.length) return;
                batch(() => {
                    appendTracks(newTracks);
                    setAutoplaySource({ id: seed.id, title: seed.title });
                    if (autoplayWaitingRef.current) {
                        autoplayWaitingRef.current = false;
                        skipNext();
                    }
                });
            })
            .catch(() => requestedRadioSeedsRef.current.delete(seed.id));
    }, [autoplay, isPlaying, tracks, trackIndex, loadRadio, appendTracks, setAutoplaySource, tracksRef, skipNext]);


    // Обновление источника при получении манифеста
    useEffect(() => {
        if (trackUrl) {
            if (currentTrack?.id && playerTrackIdsRef.current.get(player) === currentTrack.id) return;
            initializedPlayersRef.current.delete(player);
            historyRecordedPlayersRef.current.delete(player);
            restoredProgressPlayersRef.current.delete(player);
            if (currentTrack?.id) playerTrackIdsRef.current.set(player, currentTrack.id);
            player.attachSource(trackUrl);
        }
    }, [trackUrl, player, currentTrack?.id]);

    // Резервный плеер заранее загружает манифест и начальный буфер следующего трека.
    useEffect(() => {
        if (!nextTrackUrl || !nextTrack?.id) return;
        if (playerTrackIdsRef.current.get(standbyPlayer) === nextTrack.id) return;
        initializedPlayersRef.current.delete(standbyPlayer);
        historyRecordedPlayersRef.current.delete(standbyPlayer);
        restoredProgressPlayersRef.current.delete(standbyPlayer);
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
        const syncDuration = (targetPlayer: MediaPlayerClass) => {
            const id = playerTrackIdsRef.current.get(targetPlayer);
            const duration = targetPlayer.duration();
            if (id && Number.isFinite(duration) && duration > 0) {
                updateTrackDuration({ id, duration });
            }
        };
        const onStreamInitialized = () => {
            initializedPlayersRef.current.add(player);
            syncDuration(player);
            const playerTrackId = playerTrackIdsRef.current.get(player);
            const savedProgress = loadPlayerProgress();
            if (!restoredProgressPlayersRef.current.has(player)
                && playerTrackId
                && savedProgress?.trackId === playerTrackId
                && savedProgress.position > 0) {
                player.seek(savedProgress.position);
                restoredProgressPlayersRef.current.add(player);
            }
            if (isPlayingRef.current) player.play();
        };
        const onMetadataLoaded = () => syncDuration(player);
        const getFollowingTrack = () => {
            const currentTracks = tracksRef.current;
            const currentIndex = trackIndexRef.current;
            return currentTracks[currentIndex + 1];
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
                swapPlayers();
                skipNext();
            });
            return true;
        };
        const onTimeUpdated = (event: { timeToEnd?: number }) => {
            if (completedTransitionPlayersRef.current.has(player)) return;
            const playedTime = player.time();
            const playingTrackId = playerTrackIdsRef.current.get(player);
            const now = Date.now();
            if (playingTrackId && now - lastProgressSaveRef.current >= 1000) {
                lastProgressSaveRef.current = now;
                savePlayerProgress({
                    trackId: playingTrackId,
                    position: playedTime,
                    duration: player.duration() || undefined
                });
            }
            if (playedTime >= 10 && playingTrackId && !historyRecordedPlayersRef.current.has(player)) {
                historyRecordedPlayersRef.current.add(player);
                void addTrackToHistory(playingTrackId).unwrap().catch(() => {
                    historyRecordedPlayersRef.current.delete(player);
                });
            }
            const timeToEnd = event.timeToEnd;
            if (repeatRef.current || !isPlayingRef.current || typeof timeToEnd !== 'number') return;
            if ((tracksRef.current?.length || 0) < 2 || player.time() < CROSSFADE_SECONDS) return;
            // iOS Safari ties audible playback permission to a particular media
            // element. Starting the preloaded second element automatically can
            // advance its timeline while producing no sound. Keep the transition
            // on the already unlocked element on iOS; other browsers use both
            // players for the real overlap.
            if (!dualPlayerCrossfadeRef.current) return;

            if (!crossfadeRef.current.active) {
                if (timeToEnd > CROSSFADE_SECONDS || !isFollowingTrackPrepared()) return;
                crossfadeRef.current = { active: true, masterVolume: player.getVolume() };
                standbyPlayer.setMute(player.isMuted());
                standbyPlayer.setVolume(0);
                standbyPlayer.play();
                const currentIndex = trackIndexRef.current;
                const trackCount = tracksRef.current.length;
                setDisplayTrackIndex(currentIndex === trackCount - 1 ? 0 : currentIndex + 1);
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
            } else if (trackIndexRef.current >= (tracksRef.current?.length || 0) - 1) {
                autoplayWaitingRef.current = autoplayRef.current;
                setIsPlaying(false);
                player.seek(0);
            } else if ((tracksRef.current?.length || 0) > 1) {
                if (!dualPlayerCrossfadeRef.current) {
                    // Reusing the active element preserves Safari's user-gesture
                    // playback permission when the next source is attached.
                    skipNext();
                    return;
                }
                if (isFollowingTrackPrepared()) {
                    standbyPlayer.setVolume(player.getVolume());
                    standbyPlayer.setMute(player.isMuted());
                    standbyPlayer.play();
                    batch(() => {
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
        player.on('playbackMetadataLoaded', onMetadataLoaded);
        player.on('playbackEnded', onEnded);
        player.on('playbackTimeUpdated', onTimeUpdated);

        return () => {
            player.off('streamInitialized', onStreamInitialized);
            player.off('playbackMetadataLoaded', onMetadataLoaded);
            player.off('playbackEnded', onEnded);
            player.off('playbackTimeUpdated', onTimeUpdated);
        };
    }, [player, standbyPlayer, repeatRef, tracksRef, trackIndexRef, isPlayingRef, autoplayRef, skipNext, setIsPlaying, swapPlayers, setDisplayTrackIndex, addTrackToHistory, updateTrackDuration]);

    useEffect(() => {
        // Плеер снова стал активным с новым треком — старый маркер ended ему больше не нужен.
        completedTransitionPlayersRef.current.delete(player);
    }, [player]);

    useEffect(() => {
        const onStandbyInitialized = () => {
            initializedPlayersRef.current.add(standbyPlayer);
            const id = playerTrackIdsRef.current.get(standbyPlayer);
            const duration = standbyPlayer.duration();
            if (id && Number.isFinite(duration) && duration > 0) {
                updateTrackDuration({ id, duration });
            }
        };
        standbyPlayer.on('streamInitialized', onStandbyInitialized);
        standbyPlayer.on('playbackMetadataLoaded', onStandbyInitialized);
        return () => {
            standbyPlayer.off('streamInitialized', onStandbyInitialized);
            standbyPlayer.off('playbackMetadataLoaded', onStandbyInitialized);
        };
    }, [standbyPlayer, updateTrackDuration]);

    useEffect(() => {
        document.title = currentTrack?.title ?? 'UNISON';
    }, [currentTrack]);

    useEffect(() => {
        const saveFinalProgress = () => {
            const trackId = playerTrackIdsRef.current.get(progressPlayer);
            if (!trackId) return;
            try {
                savePlayerProgress({
                    trackId,
                    position: progressPlayer.time() || 0,
                    duration: progressPlayer.duration() || undefined
                });
            } catch {
                // dash.js may already be tearing down during page unload.
            }
        };
        window.addEventListener('pagehide', saveFinalProgress);
        return () => window.removeEventListener('pagehide', saveFinalProgress);
    }, [progressPlayer]);

    const cancelCrossfade = () => {
        if (!crossfadeRef.current.active) return;
        crossfadeRef.current.active = false;
        setDisplayTrackIndex(null);
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
    const mediaPlayerRef = useDependentRef(player);
    const mediaProgressPlayerRef = useDependentRef(progressPlayer);
    const mediaCancelCrossfadeRef = useDependentRef(cancelCrossfade);
    const mediaSkipNextRef = useDependentRef(handleSkipNext);
    const mediaSkipPrevRef = useDependentRef(handleSkipPrev);

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
                const target = mediaProgressPlayerRef.current;
                const duration = target.duration();
                const position = target.time();
                target.seek(Math.min(duration, Math.max(0, position + offset)));
            } catch {
                // Ignore a command received while dash.js is switching sources.
            }
        };
        const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
            play: () => setIsPlaying(true),
            pause: () => setIsPlaying(false),
            stop: () => {
                mediaCancelCrossfadeRef.current();
                setIsPlaying(false);
                mediaPlayerRef.current.seek(0);
            },
            nexttrack: () => mediaSkipNextRef.current(),
            previoustrack: () => mediaSkipPrevRef.current(),
            seekto: details => {
                if (typeof details.seekTime !== 'number') return;
                try {
                    mediaProgressPlayerRef.current.seek(details.seekTime);
                } catch {
                    // Ignore a command received while dash.js is switching sources.
                }
            }
        };
        // iOS Control Center has only two secondary media buttons. If interval
        // seeking handlers are registered, Safari gives those slots to ±10 sec
        // and hides previous/next track. The timeline still uses `seekto`.
        if (!isIOSDevice()) {
            handlers.seekbackward = details => seekBy(-(details.seekOffset ?? 10));
            handlers.seekforward = details => seekBy(details.seekOffset ?? 10);
        }

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
    }, [mediaProgressPlayerRef, mediaPlayerRef, mediaCancelCrossfadeRef, mediaSkipNextRef, mediaSkipPrevRef, setIsPlaying]);

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
        <Stack className={styles.trackControlStack}>
            <Grid className={styles.transportControls} container justifyContent="center" alignItems="center" gap={2} marginBottom={1}>
                <button className={`${styles.iconBtn} ${styles.mobileSecondaryControl}`} onClick={handleShuffle}>
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
                <button className={`${styles.iconBtn} ${styles.mobileSecondaryControl}`} onClick={handleToggleRepeat}>
                    {repeat ? <RepeatOneRounded /> : <RepeatRounded />}
                </button>
            </Grid>
            <TimeProgressBar
                player={progressPlayer}
                canReadImmediately={canReadProgressImmediately}
                trackId={displayedTrack?.id}
                fallbackDuration={displayedTrack?.duration}
            />
        </Stack>
    );
});
