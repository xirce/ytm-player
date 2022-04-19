import React from 'react';
import { Link } from 'react-router-dom';
import styles from './PlaylistItem.module.css';

export interface IPlaylistItemProps {
    name: string;
    link: string;
}

export const PlaylistItem: React.FC<IPlaylistItemProps> = ({ name, link }: IPlaylistItemProps) => {
    const to = `/playlist?name=${name}`;
    return (
        <div className={styles.container}>
            <Link to={to}>
                <div className={styles.content}>
                    <div className={styles.image} />
                    <p>{name}</p>
                </div>
            </Link>
        </div>
    );
}