import React from 'react';
import { Outlet } from 'react-router-dom';
import { PlayerWrapper } from '../components/AudioPlayer/PlayerWrapper';
import { ThemeProvider } from "@mui/material/styles";
import mainTheme from '../mainTheme';
import Grid from '@mui/material/Grid';
import Header from '../components/Header';

export const Layout: React.FC = () => {
    return (
        <ThemeProvider theme={mainTheme}>
            <Header />
            <Grid sx={(theme) => ({
                width: '100%',
                height: '100%',
                overflowY: 'scroll',
                backgroundColor: theme.palette.background.default
            })}>
                <Outlet />
            </Grid>
            <PlayerWrapper />
        </ThemeProvider>);
}