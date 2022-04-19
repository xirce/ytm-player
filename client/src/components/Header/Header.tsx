import Grid from '@mui/material/Grid';
import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Header.module.css';

const Header: React.FC = () => {
    return (
        <Grid className={styles.navBar}
            container
            justifyContent='left'
            alignItems='center'
            direction='row'>
            <Grid item>
                <NavLink to="/" className={styles.navElem}>Главная</NavLink>
            </Grid>
            <Grid item>
                <NavLink to="/myLibrary" className={styles.navElem}>Моя медиатека</NavLink>
            </Grid>
            <Grid item>
                <NavLink to="/anotherSearch" className={styles.navElem}>Поиск</NavLink>
            </Grid>
        </Grid>
    );
}

export default Header;