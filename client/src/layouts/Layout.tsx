import React from 'react';
import { Outlet } from 'react-router-dom';
import { PlayerWrapper } from '../components/Player/PlayerWrapper';
import Header from '../components/Header';
import styles from './Layout.module.css';
import { Filters } from '../components/Filters/Filters';

export const Layout: React.FC = () => {
    return (
        <>
            <Header />
            <div className={styles.container}>
                <div className={styles.content}>
                    <Outlet />
                </div>
            </div>
            <PlayerWrapper />
        </>
    );
}