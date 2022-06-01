import React from 'react';
import Grid from '@mui/material/Grid';
import { SearchControl } from "../SearchInput/SearchControl";
import styles from './Header.module.css';

const Header: React.FC = () => {
    return (
        <header className={styles.container}>
            <Grid container
                  justifyContent='center'
                  alignItems='center'
                  direction='row'>
                <Grid item xs={4}>
                    <SearchControl />
                </Grid>
            </Grid>
        </header>
    );
}

export default Header;