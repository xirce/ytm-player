import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from "react-router-dom";
import { MediaPlayer, type MediaPlayerClass } from 'dashjs';
import Grid from '@mui/material/Grid';
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import { VolumeControl } from './VolumeControl';
import { TrackControl } from "./TrackControl";
import { TrackInfo } from "./TrackInfo";
import { useAppSelector } from '../../store';
import { getCurrentTrack, getTrackIndex, getTracks } from '../../store/player';
import styles from './PlayerControls.module.css';

export const PlayerControls: React.FC = React.memo(() => {
    const firstAudioRef = useRef<HTMLAudioElement>(null);
    const secondAudioRef = useRef<HTMLAudioElement>(null);
    const [players, setPlayers] = useState<MediaPlayerClass[]>([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [isCrossfading, setIsCrossfading] = useState(false);
    const currentTrack = useAppSelector(getCurrentTrack);
    const tracks = useAppSelector(getTracks);
    const trackIndex = useAppSelector(getTrackIndex);

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
    const nextTrack = tracks.length > 1
        ? tracks[trackIndex === tracks.length - 1 ? 0 : trackIndex + 1]
        : undefined;
    const displayedTrack = isCrossfading && nextTrack ? nextTrack : currentTrack;
    const displayedPlayer = isCrossfading ? standbyPlayer : player;

    return (
        <Grid
            container
            className={styles.container}
            justifyContent='center'
            alignItems='center'
            direction='row'
            visibility={currentTrack ? 'visible' : 'hidden'}
        >
            <audio ref={firstAudioRef} style={{ display: 'none' }} />
            <audio ref={secondAudioRef} style={{ display: 'none' }} />

            <Grid item xs>
                <TrackInfo source={displayedTrack} />
            </Grid>
            <Grid item xs={4}>
                {player && standbyPlayer && (
                    <TrackControl
                        player={player}
                        standbyPlayer={standbyPlayer}
                        swapPlayers={swapPlayers}
                        progressPlayer={displayedPlayer}
                        canReadProgressImmediately={isCrossfading}
                        setIsCrossfading={setIsCrossfading}
                    />
                )}
            </Grid>
            <Grid container item xs justifyContent='center'>
                <Grid item xs={8}>
                    {displayedPlayer && (
                        <VolumeControl
                            player={displayedPlayer}
                            ignorePlayerVolumeChanges={isCrossfading}
                        />
                    )}
                </Grid>
                <Grid item>
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
