import React from 'react';
import styles from './Styles.module.css';
import { IAlbum } from '../../../../shared';

export interface AlbumProps {
    info: IAlbum;
}

export const Album: React.FC<AlbumProps> = ({ info }) => {
    return (
        <div className={styles.container}>
            <div className={styles.images}>
                <img src={info.imageUrl} className={styles.image} />
            </div>
            <div className={styles.info}>
                <p className={styles.white}>{info.name}</p>
                <div className={styles.line}>
                    <p>{info.artist}</p>
                    <p>{info.year}</p>
                </div>
            </div>
        </div>
    )
}