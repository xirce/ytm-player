import React from "react";
import { NavLink, Outlet } from 'react-router-dom';
import styles from './MyLibrary.module.css';


export const MyLibrary: React.FC = () => {
    return (
        <>
            <div className={styles.container}>
                <NavLink to="playlists" className={styles.navElem}>Плейлисты</NavLink>
                <NavLink to="albums" className={styles.navElem}>Альбомы</NavLink>
                <NavLink to="tracks" className={styles.navElem}>Треки</NavLink>
            </div>
            <Outlet />
        </>
    );
}