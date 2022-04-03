import React from 'react';
import { InputBase, Grid } from "@mui/material";
import styles from './SearchInput.module.css';

export const SearchInput: React.FC = () => {
    return (
        <InputBase
            className={styles.field}
            placeholder='Поиск...'
        />
    );
}