import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import { MediaPlayer, type MediaPlayerClass } from 'dashjs';
import Grid from '@mui/material/Grid';
import useMediaQuery from '@mui/material/useMediaQuery';
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { VolumeControl } from './VolumeControl';
import { TrackControl } from "./TrackControl";
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
    const displayTrackIndex = useAppSelector(state => state.player.displayTrackIndex);
    const displayedTrack = useAppSelector(getDisplayedTrack);

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
    const isCrossfading = displayTrackIndex !== null;
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
            <img
                className={styles.sharedArtwork}
                data-player-shared-artwork
                src={displayedTrack.imageUrls?.large ?? displayedTrack.imageUrl}
                alt={displayedTrack.title}
                draggable={false}
                referrerPolicy='no-referrer'
                onClick={() => !expanded && setExpanded(true)}
            />
        )}
        </div>
    );
});
