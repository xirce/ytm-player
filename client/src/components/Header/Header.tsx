import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import { Link } from 'react-router-dom';
import { SearchControl } from "../SearchInput/SearchControl";
import styles from './Header.module.css';
import { YouTubeAuthControl } from '../Auth/YouTubeAuthControl';
import { MenuWrapper } from '../Menu/MenuWrapper';

const Header: React.FC = () => {
    const [libraryAnchor, setLibraryAnchor] = useState<HTMLElement | null>(null);

    return (
        <header className={styles.container}>
            <Grid container
                  justifyContent='space-between'
                  alignItems='center'
                  direction='row'>
                <Grid item xs={4}>
                    <div className={styles.navigation}>
                        <Link className={styles.home} to='/'>UNISON</Link>
                        <button
                            className={styles.library}
                            onClick={event => setLibraryAnchor(event.currentTarget)}
                        >
                            Библиотека
                        </button>
                        <MenuWrapper
                            anchorEl={libraryAnchor}
                            open={Boolean(libraryAnchor)}
                            onClose={() => setLibraryAnchor(null)}
                        >
                            <MenuItem component={Link} to='/history'>История</MenuItem>
                        </MenuWrapper>
                    </div>
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
