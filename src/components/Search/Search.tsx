import React from 'react';
import {InputBase, Grid} from "@mui/material";

export const Search: React.FC = () => {
    return (
        <Grid container justifyContent='center' padding={1}>
            <InputBase
                placeholder='Поиск...'
                sx={theme => ({
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.getContrastText(theme.palette.background.paper),
                    width: '50%',
                    height: '3rem',
                    borderRadius: 1,
                    padding: 1,
                    '& input': {
                        padding: 0,
                        fontWeight: 'bold',
                        fontSize: '1.2rem'
                    }
                })}
            />
        </Grid>
    );
}