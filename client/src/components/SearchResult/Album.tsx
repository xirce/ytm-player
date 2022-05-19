import React from 'react';
import styles from './SearchResult.module.css';
import { IAlbumBase } from '../../../../shared';
import { Link } from 'react-router-dom';

export interface IAlbumProps {
    info: IAlbumBase;
}

export const Album: React.FC<IAlbumProps> = ({ info }) => {
    return (
        <Link to={`/album/${info.id}`}>
            <div className={styles.container}>
                <div className={styles.imageContainer}>
                    <img className={styles.image} src={info.imageUrl} />
                </div>
                <div className={styles.info}>
                    <p className={styles.white}>{info.name}</p>
                    <div className={styles.line}>
                        <p>{info.artist.name}</p>
                        <p>{info.year}</p>
                    </div>
                </div>
            </div>
        </Link>
    )
}