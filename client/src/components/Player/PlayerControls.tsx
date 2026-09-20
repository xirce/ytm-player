import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import { MediaPlayer, type MediaPlayerClass } from 'dashjs';
import Grid from '@mui/material/Grid';
import useMediaQuery from '@mui/material/useMediaQuery';
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { VolumeControl } from './VolumeControl';
import { TrackControl, type TrackNavigation } from "./TrackControl";
import { TrackInfo } from "./TrackInfo";
import { usePlayerSheet } from '../../hooks/usePlayerSheet';
import { useAppDispatch, useAppSelector } from '../../store';
import { getCurrentTrack, getDisplayedTrack, getIsPlaying, playerSlice } from '../../store/player';
import styles from './PlayerControls.module.css';

const createSilentAudio = () => {
    const sampleRate = 8000;
    const dataLength = sampleRate * 10;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const write = (offset: number, value: string) => {
        for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index));
    };

    write(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    write(8, 'WAVEfmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    write(36, 'data');
    view.setUint32(40, dataLength, true);
    new Uint8Array(buffer, 44).fill(128);
    return new Blob([buffer], { type: 'audio/wav' });
};

export const PlayerControls: React.FC = React.memo(() => {
    const location = useLocation();
    const firstAudioRef = useRef<HTMLAudioElement>(null);
    const secondAudioRef = useRef<HTMLAudioElement>(null);
    const keepaliveAudioRef = useRef<HTMLAudioElement>(null);
    const [players, setPlayers] = useState<MediaPlayerClass[]>([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const dispatch = useAppDispatch();
    const expanded = useAppSelector(state => state.player.isExpanded);
    const setExpanded = useCallback((value: boolean) => {
        dispatch(playerSlice.actions.setPlayerExpanded(value));
    }, [dispatch]);
    const isMobile = useMediaQuery('(max-width:700px)');
    const [miniControlsContainer, setMiniControlsContainer] = useState<HTMLDivElement | null>(null);
    const fullLayout = isMobile || expanded;
    const currentTrack = useAppSelector(getCurrentTrack);
    const sheet = usePlayerSheet(isMobile && !!currentTrack, expanded, setExpanded);
    const overlayVisible = isMobile ? sheet.visible : expanded;
    const isPlaying = useAppSelector(getIsPlaying);
    const tracks = useAppSelector(state => state.player.tracks);
    const trackIndex = useAppSelector(state => state.player.trackIndex);
    const displayTrackIndex = useAppSelector(state => state.player.displayTrackIndex);
    const isCrossfading = displayTrackIndex !== null;
    const displayedTrack = useAppSelector(getDisplayedTrack);
    const trackNavigationRef = useRef<TrackNavigation | null>(null);
    const artworkCarouselRef = useRef<HTMLDivElement>(null);
    const artworkScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const artworkPointerStartRef = useRef(0);
    const artworkPointerActiveRef = useRef(false);
    const artworkTouchActiveRef = useRef(false);
    const artworkNavigationPendingRef = useRef(false);
    const suppressArtworkClickRef = useRef(false);
    const setTrackNavigation = useCallback((navigation: TrackNavigation | null) => {
        trackNavigationRef.current = navigation;
    }, []);
    const settleArtworkCarousel = useCallback(() => {
        const carousel = artworkCarouselRef.current;
        const slides = carousel?.querySelectorAll<HTMLElement>('[data-player-artwork-slide]');
        if (!carousel || !slides?.length || artworkPointerActiveRef.current
            || artworkTouchActiveRef.current || artworkNavigationPendingRef.current) return;
        const positions = Array.from(slides, slide =>
            slide.offsetLeft - (carousel.clientWidth - slide.offsetWidth) / 2);
        const closest = positions.reduce((best, position, index) =>
            Math.abs(position - carousel.scrollLeft) < Math.abs(positions[best] - carousel.scrollLeft) ? index : best, 0);
        if (Math.abs(positions[closest] - carousel.scrollLeft) > 2) {
            carousel.scrollTo({ left: positions[closest], behavior: 'smooth' });
            return;
        }
        if (tracks.length > 1 && closest !== 1) {
            const navigate = closest === 0
                ? trackNavigationRef.current?.previous
                : trackNavigationRef.current?.next;
            if (navigate) {
                artworkNavigationPendingRef.current = true;
                navigate();
                return;
            }
        }
        carousel.scrollLeft = positions[1];
    }, [tracks.length]);
    const finishArtworkGesture = useCallback(() => {
        const carousel = artworkCarouselRef.current;
        if (carousel && Math.abs(carousel.scrollLeft - artworkPointerStartRef.current) > 5) {
            suppressArtworkClickRef.current = true;
        }
        if (artworkScrollTimerRef.current) clearTimeout(artworkScrollTimerRef.current);
        artworkScrollTimerRef.current = setTimeout(settleArtworkCarousel, 120);
    }, [settleArtworkCarousel]);
    const artworkGestureHandlers = {
        onPointerDown: () => {
            artworkPointerActiveRef.current = true;
            if (artworkScrollTimerRef.current) clearTimeout(artworkScrollTimerRef.current);
            suppressArtworkClickRef.current = false;
            artworkPointerStartRef.current = artworkCarouselRef.current?.scrollLeft ?? 0;
        },
        onPointerUp: () => {
            artworkPointerActiveRef.current = false;
            if (!artworkTouchActiveRef.current) finishArtworkGesture();
        },
        onPointerCancel: () => {
            artworkPointerActiveRef.current = false;
            if (!artworkTouchActiveRef.current) finishArtworkGesture();
        },
        onTouchStart: () => {
            artworkTouchActiveRef.current = true;
            if (artworkScrollTimerRef.current) clearTimeout(artworkScrollTimerRef.current);
            suppressArtworkClickRef.current = false;
            artworkPointerStartRef.current = artworkCarouselRef.current?.scrollLeft ?? 0;
        },
        onTouchEnd: () => {
            artworkTouchActiveRef.current = false;
            artworkPointerActiveRef.current = false;
            finishArtworkGesture();
        },
        onTouchCancel: () => {
            artworkTouchActiveRef.current = false;
            artworkPointerActiveRef.current = false;
            finishArtworkGesture();
        },
        onClick: (event: React.MouseEvent<HTMLDivElement>) => {
            if (suppressArtworkClickRef.current) {
                suppressArtworkClickRef.current = false;
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            if (!expanded) setExpanded(true);
        }
    };
    const previousTrackIndex = isCrossfading
        ? trackIndex
        : trackIndex === 0 ? tracks.length - 1 : trackIndex - 1;
    const nextTrackIndex = trackIndex === tracks.length - 1 ? 0 : trackIndex + 1;
    const artworkTracks = [tracks[previousTrackIndex], displayedTrack, tracks[nextTrackIndex]];

    useLayoutEffect(() => {
        const carousel = artworkCarouselRef.current;
        if (!carousel) return;
        const center = () => {
            const currentSlide = carousel.querySelectorAll<HTMLElement>('[data-player-artwork-slide]')[1];
            const cardWidth = carousel.parentElement?.clientWidth;
            if (cardWidth) carousel.style.setProperty('--artwork-card-width', `${cardWidth}px`);
            if (currentSlide) {
                carousel.scrollLeft = currentSlide.offsetLeft - (carousel.clientWidth - currentSlide.offsetWidth) / 2;
            }
            artworkNavigationPendingRef.current = false;
        };
        center();
        const observer = new ResizeObserver(center);
        observer.observe(carousel);
        return () => observer.disconnect();
    }, [displayedTrack?.id, trackIndex, displayTrackIndex, isMobile]);

    useEffect(() => () => {
        if (artworkScrollTimerRef.current) clearTimeout(artworkScrollTimerRef.current);
    }, []);

    useEffect(() => {
        const audio = keepaliveAudioRef.current;
        if (!audio) return;
        const source = URL.createObjectURL(createSilentAudio());
        audio.src = source;
        return () => URL.revokeObjectURL(source);
    }, []);

    const startKeepalive = useCallback(() => {
        const audio = keepaliveAudioRef.current;
        if (!audio || !audio.paused) return;
        void audio.play().catch(() => {
            // A later user-initiated Play can retry if WebKit rejects this attempt.
        });
    }, []);

    useEffect(() => {
        if (isPlaying) {
            startKeepalive();
        } else {
            keepaliveAudioRef.current?.pause();
        }
    }, [isPlaying, startKeepalive]);

    useEffect(() => {
        if (!firstAudioRef.current || !secondAudioRef.current) return;
        const createdPlayers = [firstAudioRef.current, secondAudioRef.current].map(element => {
            const player = MediaPlayer().create();
            player.initialize(element, undefined, false);
            return player;
        });
        setPlayers(createdPlayers);

        return () => {
            createdPlayers.forEach(player => player.reset());
        };
    }, []);

    const player = players[activePlayerIndex];
    const standbyPlayer = players[1 - activePlayerIndex];
    const swapPlayers = useCallback(() => setActivePlayerIndex(index => 1 - index), []);
    const displayedPlayer = isCrossfading ? standbyPlayer : player;

    useEffect(() => {
        if (!overlayVisible) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const collapseOnLink = (event: MouseEvent) => {
            const target = event.target;
            if (target instanceof Element && target.closest('a[href]')) {
                setExpanded(false);
            }
        };
        document.addEventListener('click', collapseOnLink);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('click', collapseOnLink);
        };
    }, [overlayVisible, setExpanded]);

    useEffect(() => {
        setExpanded(false);
    }, [location.pathname, location.search, setExpanded]);

    return (
        <div
            ref={sheet.ref}
            className={isMobile ? styles.sheetHost : undefined}
            style={{ visibility: currentTrack ? 'visible' : 'hidden' }}
            {...sheet.handlers}
        >
        <Grid
            data-player-panel
            container
            className={`${styles.container} ${fullLayout ? styles.expanded : styles.mini} ${isMobile ? styles.sheet : ''}`}
            justifyContent='center'
            alignItems='center'
            direction='row'
            visibility={currentTrack ? 'visible' : 'hidden'}
        >
            {isMobile && <>
                <div className={`${styles.container} ${styles.mini} ${styles.morphMini}`} data-player-layer='mini'>
                    <div className={styles.miniInfo} onClick={() => setExpanded(true)}>
                        <TrackInfo source={displayedTrack} sharedArtwork />
                    </div>
                    <div ref={setMiniControlsContainer} className={styles.miniTransport} />
                </div>
            </>}
            <audio
                ref={keepaliveAudioRef}
                preload='auto'
                aria-hidden
                style={{ display: 'none' }}
                onEnded={() => isPlaying && startKeepalive()}
            />
            <audio ref={firstAudioRef} style={{ display: 'none' }} />
            <audio ref={secondAudioRef} style={{ display: 'none' }} />

            {fullLayout && (
                <button
                    className={`${styles.iconBtn} ${styles.collapseButton}`}
                    onClick={() => setExpanded(false)}
                    aria-label='Свернуть плеер'
                    data-player-layer='full'
                >
                    <KeyboardArrowDownRoundedIcon fontSize='large' />
                </button>
            )}

            <Grid
                item
                xs
                className={styles.trackInfoColumn}
                onClick={() => !expanded && setExpanded(true)}
                data-player-layer='full'
            >
                <TrackInfo source={displayedTrack} expanded={fullLayout} sharedArtwork={isMobile} />
            </Grid>
            <Grid item xs={4} className={styles.trackControlColumn} data-player-layer='full'>
                {player && standbyPlayer && (
                    <TrackControl
                        player={player}
                        standbyPlayer={standbyPlayer}
                        swapPlayers={swapPlayers}
                        progressPlayer={displayedPlayer}
                        canReadProgressImmediately={isCrossfading}
                        miniControlsContainer={isMobile ? miniControlsContainer : null}
                        onPlayRequested={startKeepalive}
                        onTrackNavigationChange={setTrackNavigation}
                    />
                )}
            </Grid>
            <Grid container item xs justifyContent='center' className={styles.volumeColumn} data-player-layer='full'>
                <Grid item xs={8}>
                    {displayedPlayer && (
                        <VolumeControl
                            player={displayedPlayer}
                            ignorePlayerVolumeChanges={isCrossfading}
                        />
                    )}
                </Grid>
                <Grid item className={styles.queueButton}>
                    <Link to='/queue'>
                        <button className={styles.iconBtn} title='Очередь'>
                            <QueueMusicRoundedIcon />
                        </button>
                    </Link>
                </Grid>
            </Grid>
        </Grid>
        {isMobile && (displayedTrack?.imageUrls?.large ?? displayedTrack?.imageUrl) && (
            <div className={styles.sharedArtwork} data-player-shared-artwork {...artworkGestureHandlers}>
                <div
                    ref={artworkCarouselRef}
                    className={`${styles.artworkCarousel} ${tracks.length < 2 ? styles.singleArtwork : ''}`}
                    onScroll={() => {
                        if (artworkScrollTimerRef.current) clearTimeout(artworkScrollTimerRef.current);
                        artworkScrollTimerRef.current = setTimeout(settleArtworkCarousel, 80);
                    }}
                >
                    {artworkTracks.map((track, index) => <div
                        className={styles.artworkSlide}
                        key={`${index}-${track?.id ?? 'empty'}`}
                        aria-hidden={index !== 1}
                        data-player-artwork-slide
                    >
                        {(track?.imageUrls?.large ?? track?.imageUrl) && <img
                            className={styles.sharedArtworkImage}
                            src={track.imageUrls?.large ?? track.imageUrl}
                            alt={index === 1 ? track.title : ''}
                            draggable={false}
                            referrerPolicy='no-referrer'
                        />}
                    </div>)}
                </div>
            </div>
        )}
        </div>
    );
});
