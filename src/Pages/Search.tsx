import React from 'react';
import {InputBase, Grid} from "@mui/material";

export const Search: React.FC = () => {
    return (
        <Grid container justifyContent='center' padding={2}>
            <InputBase
                type='search'
                placeholder='Search...'
                sx={theme => ({
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.getContrastText(theme.palette.background.paper),
                    width: '50%',
                    padding: 1,
                    borderRadius: 2,
                })}/>
        </Grid>
    );
}