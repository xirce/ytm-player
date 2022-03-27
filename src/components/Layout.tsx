import React from 'react';
import {Link, Outlet} from 'react-router-dom';
import {AudioWrapper} from './AudioPlayer/AudioWrapper';
import Box from "@mui/material/Box";
import {ThemeProvider} from "@mui/material/styles";
import mainTheme from '../mainTheme';
import '../styles/Layout.css';

export const Layout: React.FC = () => {
    return (
        <ThemeProvider theme={mainTheme}>
                <Box sx={(theme) => ({
                    display: "flex",
                    padding: "10px",
                    alignItems: "center",
                    gap: "20px",
                    backgroundColor: theme.palette.primary.dark,
                    height: "50px"
                    })}>
                    <Link to="/" className="navElem">Главная</Link>
                    <Link to="/search" className="navElem">Поиск</Link>
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