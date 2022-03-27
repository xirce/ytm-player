import Grid from '@mui/material/Grid';
import Box from "@mui/material/Box";
import React from "react";
import {Routes, Route, Link} from 'react-router-dom';
export const MainPage: React.FC = () => {
    return (
        <Grid
            container
            justifyContent='center'
            alignItems='center'
            padding={2}
            sx={(theme) => ({
                backgroundColor: theme.palette.background.default
            })
        }>
            <Grid item xs={12}>
                <Box sx={{
                    color: "white"
                }}>
                    <h1>Рекомендации</h1>
                    <Box sx={{
                        display: "flex",
                        padding: 1,
                        backgroundColor: "white"
                    }}>
                        <Link to="/1">
                            <p>Название плейлиста</p>
                            <p>Описание</p>
                        </Link>
                    </Box>
                </Box>
            </Grid>
            <Grid item xs={12}>
                <Box sx={{
                        color: "white"
                    }}>
                    <h1>Новое</h1>
                </Box>
            </Grid>
            <Grid item xs={12}>
                <Box sx={{
                            color: "white"
                        }}>
                    <h1>Что-то ещё</h1>
                </Box>
            </Grid>
        </Grid>
    );
}