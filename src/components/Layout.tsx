import React from 'react';
import {NavLink, Outlet} from 'react-router-dom';
import {AudioWrapper} from './AudioPlayer/AudioWrapper';
import Box from "@mui/material/Box";
import {ThemeProvider} from "@mui/material/styles";
import mainTheme from '../mainTheme';
import '../styles/Layout.css';
import {Search} from './Search/Search'

export const Layout: React.FC = () => {
    return (
        <ThemeProvider theme={mainTheme}>
                <Box sx={(theme) => ({
                    display: "flex",
                    alignItems: "center",
                    height: '3rem',
                    padding: 2,
                    gap: 3,
                    backgroundColor: theme.palette.primary.dark,
                    })}>
                    <NavLink to="/" className="navElem">Главная</NavLink>
                    <NavLink to="/myMusic" className="navElem">Моя медиатека</NavLink>
                    <NavLink to="/search" className="navElem">Поиск</NavLink>
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