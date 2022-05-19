import React from 'react';
import Grid from "@mui/material/Grid";
import { useAppSelector } from "../../store";
import { getTracks } from "../../store/player";
import { TrackList } from "../../components/TrackList/TrackList";
import styles from "./Queue.module.css";

export const Queue: React.FC = React.memo(() => {
    const tracks = useAppSelector(getTracks);

    return (
        <Grid container justifyContent='center' alignItems='center' direction='column'>
            <Grid className={styles.header} container justifyContent='space-between' alignItems='center'>
                <Grid item>
                    <span className={styles.title}>Очередь</span>
                </Grid>
            </Grid>
            <Grid container justifyContent='center' alignItems='center'>
                <Grid item xs>
                    {
                        tracks.length > 0
                            ? <TrackList source={tracks}/>
                            : 'Пусто'
                    }
                </Grid>
            </Grid>
        </Grid>
    );
});