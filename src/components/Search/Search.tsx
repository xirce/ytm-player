import React from 'react';
import {InputBase, Grid} from "@mui/material";
import styles from './Search.module.scss';

export const Search: React.FC = () => {
    return (
        <Grid container justifyContent='center' padding={1}>
            <InputBase
                className={styles.field}
                placeholder='Поиск...'
                sx={theme => ({
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.getContrastText(theme.palette.background.paper),
                })}
            />
        </Grid>
    );
}