import Grid from '@mui/material/Grid';
import Box from "@mui/material/Box";
import React from "react";
import {Routes, Route, Link} from 'react-router-dom';
import {PlaylistElem} from '../../components/PlaylistElem/PlaylistElem';
import styles from './Main.module.scss';

export const Main: React.FC = () => {
    return (
        <Grid
            className={styles.content}
            container
            justifyContent='center'
            alignItems='center'
            sx={(theme) => ({
                backgroundColor: theme.palette.background.default
            })
        }>
            <Grid item xs={12}>
                <h1 style={{color: 'white'}}>Рекомендации</h1>
                <div style={{display: 'flex'}}>
                    <PlaylistElem name={'Плейлист 1'} link={''} />
                    <PlaylistElem name={'Плейлист 2'} link={''} />
                </div>
            </Grid>
            <Grid item xs={12}>
                <h1 style={{color: 'white'}}>Новое</h1>
                <div style={{display: 'flex'}}>
                </div>
            </Grid>
            <Grid item xs={12}>
                <h1 style={{color: 'white'}}>Что-то ещё</h1>
                <div style={{display: 'flex'}}>
                </div>
            </Grid>
        </Grid>
    );
}