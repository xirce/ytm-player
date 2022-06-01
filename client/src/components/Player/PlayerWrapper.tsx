import React from 'react';
import { PlayerControls } from './PlayerControls';
import styles from './PlayerWrapper.module.css';


export const PlayerWrapper: React.FC = () => {
    return (
        <footer className={styles.container}>
            <PlayerControls />
        </footer>
    );
}