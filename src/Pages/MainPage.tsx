import Grid from '@mui/material/Grid';
import React from "react";

export const MainPage: React.FC = () => {
    return (
        <Grid
            container
            justifyContent='center'
            alignItems='center'
            sx={(theme) => ({
                backgroundColor: theme.palette.background.default,
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            })}>
        </Grid>
    );
}