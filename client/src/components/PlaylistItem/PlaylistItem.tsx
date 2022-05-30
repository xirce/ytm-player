import React from 'react';
import { Link } from 'react-router-dom';
import { IAlbumInfo } from '../../../../shared';
import styles from './PlaylistItem.module.css';

export interface IPlaylistItemProps {
    info: IAlbumInfo
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