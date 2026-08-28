import React, { useEffect, useRef, useState } from 'react';
import { Link } from "react-router-dom";
import { MediaPlayer, type MediaPlayerClass } from 'dashjs';
import Grid from '@mui/material/Grid';
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import { VolumeControl } from './VolumeControl';
import { TrackControl } from "./TrackControl";
import { TrackInfo } from "./TrackInfo";
import { useAppSelector } from '../../store';
import { getCurrentTrack } from '../../store/player';
import styles from './PlayerControls.module.css';

export const PlayerControls: React.FC = React.memo(() => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [player, setPlayer] = useState<MediaPlayerClass | null>(null);
    const currentTrack = useAppSelector(getCurrentTrack);

    useEffect(() => {
        if (!audioRef.current) return;
        // Создаём плеер один раз и инициализируем с аудио-элементом
        const player = MediaPlayer().create();
        player.initialize(audioRef.current, undefined, false);
        setPlayer(player);

        return () => {
            player.reset();
        };
    }, []);

    return (
        <Grid
            container
            className={styles.container}
            justifyContent='center'
            alignItems='center'
            direction='row'
            visibility={currentTrack ? 'visible' : 'hidden'}
        >
            {/* Скрытый аудио-элемент – движок dash.js будет управлять им */}
            <audio ref={audioRef} style={{ display: 'none' }} />

            <Grid item xs>
                <TrackInfo source={currentTrack} />
            </Grid>
            <Grid item xs={4}>
                {player && <TrackControl player={player} />}
            </Grid>
            <Grid container item xs justifyContent='center'>
                <Grid item xs={8}>
                    {player && <VolumeControl player={player} />}
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
