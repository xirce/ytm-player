import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import MenuRounded from '@mui/icons-material/MenuRounded';
import HomeRounded from '@mui/icons-material/HomeRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import LibraryMusicRounded from '@mui/icons-material/LibraryMusicRounded';
import { Link, NavLink } from 'react-router-dom';
import { SearchControl } from "../SearchInput/SearchControl";
import styles from './Header.module.css';
import { YouTubeAuthControl } from '../Auth/YouTubeAuthControl';
import { MenuWrapper } from '../Menu/MenuWrapper';

const Header: React.FC = () => {
    const [libraryAnchor, setLibraryAnchor] = useState<HTMLElement | null>(null);
    const [mobileAnchor, setMobileAnchor] = useState<HTMLElement | null>(null);

    return (
        <header className={styles.container} data-player-navigation>
            <Grid container className={styles.desktopContent}
                  justifyContent='space-between'
                  alignItems='center'
                  direction='row'>
                <Grid item xs={4} className={styles.navigationColumn}>
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
                <Grid item xs={4} className={styles.search}>
                    <SearchControl />
                </Grid>
                <Grid item xs={4} className={styles.auth}>
                    <YouTubeAuthControl />
                </Grid>
                <Grid item className={styles.mobileMenu}>
                    <button
                        className={styles.mobileMenuButton}
                        aria-label='Открыть меню'
                        onClick={event => setMobileAnchor(event.currentTarget)}
                    >
                        <MenuRounded />
                    </button>
                    <MenuWrapper
                        anchorEl={mobileAnchor}
                        open={Boolean(mobileAnchor)}
                        onClose={() => setMobileAnchor(null)}
                    >
                        <MenuItem component={Link} to='/history'>История</MenuItem>
                        <div className={styles.mobileAuth} onClick={event => event.stopPropagation()}>
                            <YouTubeAuthControl />
                        </div>
                    </MenuWrapper>
                </Grid>
            </Grid>
            <nav className={styles.bottomNavigation} aria-label='Основная навигация'>
                <NavLink to='/' end className={({ isActive }) => isActive ? styles.activeNavItem : styles.navItem}>
                    <HomeRounded />
                    <span>Главная</span>
                </NavLink>
                <NavLink to='/search' className={({ isActive }) => isActive ? styles.activeNavItem : styles.navItem}>
                    <SearchRounded />
                    <span>Поиск</span>
                </NavLink>
                <NavLink to='/history' className={({ isActive }) => isActive ? styles.activeNavItem : styles.navItem}>
                    <LibraryMusicRounded />
                    <span>Библиотека</span>
                </NavLink>
            </nav>
        </header>
    );
}

export default Header;
