import React from 'react';
import {Link, Outlet} from 'react-router-dom';
import {AudioWrapper} from './AudioPlayer/AudioWrapper';
import Box from "@mui/material/Box";
import {ThemeProvider} from "@mui/material/styles";
import mainTheme from '../mainTheme';

export const Layout: React.FC = () => {
    return (
        <ThemeProvider theme={mainTheme}>
                <Box sx={(theme) => ({backgroundColor: theme.palette.primary.dark})}>
                    <Link to="/">Главная</Link>
                    <Link to="/search">Поиск</Link>
                </Box>
                <Box sx={(theme) => ({
                    width: '100%',
                    height: '100%',
                    backgroundColor: theme.palette.background.default
                })}>
                    <Outlet/>
                </Box>
                <AudioWrapper/>
        </ThemeProvider>);
}