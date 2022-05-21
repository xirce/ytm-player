import React from 'react';
import { Link } from 'react-router-dom';
import styles from './PlaylistItem.module.css';
import { IAlbumBase } from '../../../../shared';

export interface IPlaylistItemProps {
    info: IAlbumBase
}

export const PlaylistItem: React.FC<IPlaylistItemProps> = ({ info }: IPlaylistItemProps) => {
    const to = `/album/${info.id}`;

    return (
        <Link to={to}>
            <div className={styles.container}>
                <div className={styles.imageContainer}>
                    <img src={info.imageUrl} className={styles.image} />
                </div>
                <span className={styles.name}>{info.name}</span>
                <span className={styles.year}>{info.year}</span>
            </div>
        </Link>
    );
}