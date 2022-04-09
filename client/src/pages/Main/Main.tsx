import Grid from '@mui/material/Grid';
import React from "react";
import {PlaylistItem} from '../../components/PlaylistItem/PlaylistItem';
import styles from './Main.module.css';


export const Main: React.FC = () => {
    return (
        <Grid
            className={styles.container}
            container
            justifyContent='center'
            alignItems='center'
        >
            <Grid item xs={12}>
                <h1 style={{color: 'white'}}>Рекомендации</h1>
                <div style={{display: 'flex'}}>
                    <PlaylistItem name={'Плейлист 1'} link={''}/>
                    <PlaylistItem name={'Плейлист 2'} link={''}/>
                    <PlaylistItem name={'Плейлист 3'} link={''}/>
                    <PlaylistItem name={'Плейлист 4'} link={''}/>
                </div>
            </Grid>
            <Grid item xs={12}>
                <h1 style={{color: 'white'}}>Новое</h1>
                <div style={{display: 'flex'}}>
                    <PlaylistItem name={'Плейлист 1'} link={''}/>
                    <PlaylistItem name={'Плейлист 2'} link={''}/>
                    <PlaylistItem name={'Плейлист 3'} link={''}/>
                    <PlaylistItem name={'Плейлист 4'} link={''}/>
                </div>
            </Grid>
            <Grid item xs={12}>
                <h1 style={{color: 'white'}}>Что-то ещё</h1>
                <div style={{display: 'flex'}}>
                    <PlaylistItem name={'Плейлист 1'} link={''}/>
                    <PlaylistItem name={'Плейлист 2'} link={''}/>
                    <PlaylistItem name={'Плейлист 3'} link={''}/>
                    <PlaylistItem name={'Плейлист 4'} link={''}/>
                </div>
            </Grid>
        </Grid>
    )
        ;
}