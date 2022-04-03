import React from 'react';
import {InputBase, Grid} from "@mui/material";
import styles from './Search.module.css';

export const Search: React.FC = () => {
    return (
        <InputBase
            className={styles.field}
            placeholder='Поиск...'
            sx={({
                '& input': {
                    padding: 0,
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                }
            })}
        />
    );
}