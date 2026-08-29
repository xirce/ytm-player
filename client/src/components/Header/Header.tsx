import React from 'react';
import Grid from '@mui/material/Grid';
import { Link } from 'react-router-dom';
import { SearchControl } from "../SearchInput/SearchControl";
import styles from './Header.module.css';
import { YouTubeAuthControl } from '../Auth/YouTubeAuthControl';

const Header: React.FC = () => {
    return (
        <header className={styles.container}>
            <Grid container
                  justifyContent='space-between'
                  alignItems='center'
                  direction='row'>
                <Grid item xs={4}>
                    <Link className={styles.home} to='/'>UNISON</Link>
                </Grid>
                <Grid item xs={4}>
                    <SearchControl />
                </Grid>
                <Grid item xs={4} className={styles.auth}>
                    <YouTubeAuthControl />
                </Grid>
            </Grid>
        </header>
    );
}

export default Header;
