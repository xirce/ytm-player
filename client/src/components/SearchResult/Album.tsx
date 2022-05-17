import React from 'react';
import styles from './SearchResult.module.css';
import { IAlbum } from '../../../../shared';
import { Link } from 'react-router-dom';

export interface IAlbumProps {
    info: IAlbum;
}

export const Album: React.FC<IAlbumProps> = ({ info }) => {
    const to = `/album/${info.id}`
    return (
        <Link to={to}>
            <div className={styles.container}>
                <div className={styles.imageContainer}>
                    <img className={styles.image} src={info.imageUrl} />
                </div>
                <div className={styles.info}>
                    <p className={styles.white}>{info.name}</p>
                    <div className={styles.line}>
                        <p>{info.artist}</p>
                        <p>{info.year}</p>
                    </div>
                </div>
            </div>
        </Link>
    )
}