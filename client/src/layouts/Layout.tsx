import React from 'react';
import { Outlet } from 'react-router-dom';
import { PlayerWrapper } from '../components/Player/PlayerWrapper';
import Header from '../components/Header';
import styles from './Layout.module.css';

export const Layout: React.FC = () => {
    return (
        <>
            <Header />
            <div className={styles.content}>
                <div className={styles.container}>
                    <Outlet />
                </div>
            </div>
            <PlayerWrapper  />
        </>
    );
}