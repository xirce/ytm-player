import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import { MediaPlayer, type MediaPlayerClass } from 'dashjs';
import Grid from '@mui/material/Grid';
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { VolumeControl } from './VolumeControl';
import { TrackControl } from "./TrackControl";
import { TrackInfo } from "./TrackInfo";
import { useAppSelector } from '../../store';
import { getCurrentTrack, getDisplayedTrack } from '../../store/player';
import styles from './PlayerControls.module.css';

export const PlayerControls: React.FC = React.memo(() => {
    const location = useLocation();
    const firstAudioRef = useRef<HTMLAudioElement>(null);
    const secondAudioRef = useRef<HTMLAudioElement>(null);
    const [players, setPlayers] = useState<MediaPlayerClass[]>([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const currentTrack = useAppSelector(getCurrentTrack);
    const displayTrackIndex = useAppSelector(state => state.player.displayTrackIndex);
    const displayedTrack = useAppSelector(getDisplayedTrack);

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
        if (!expanded) return;
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
    }, [expanded]);

    useEffect(() => {
        setExpanded(false);
    }, [location.pathname, location.search]);

    return (
        <Grid
            container
            className={`${styles.container} ${expanded ? styles.expanded : styles.mini}`}
            justifyContent='center'
            alignItems='center'
            direction='row'
            visibility={currentTrack ? 'visible' : 'hidden'}
        >
            <audio ref={firstAudioRef} style={{ display: 'none' }} />
            <audio ref={secondAudioRef} style={{ display: 'none' }} />

            {expanded && (
                <button
                    className={`${styles.iconBtn} ${styles.collapseButton}`}
                    onClick={() => setExpanded(false)}
                    aria-label='Свернуть плеер'
                >
                    <KeyboardArrowDownRoundedIcon fontSize='large' />
                </button>
            )}

            <Grid
                item
                xs
                className={styles.trackInfoColumn}
                onClick={() => !expanded && setExpanded(true)}
            >
                <TrackInfo source={displayedTrack} expanded={expanded} />
            </Grid>
            <Grid item xs={4} className={styles.trackControlColumn}>
                {player && standbyPlayer && (
                    <TrackControl
                        player={player}
                        standbyPlayer={standbyPlayer}
                        swapPlayers={swapPlayers}
                        progressPlayer={displayedPlayer}
                        canReadProgressImmediately={isCrossfading}
                    />
                )}
            </Grid>
            <Grid container item xs justifyContent='center' className={styles.volumeColumn}>
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
    );
});
