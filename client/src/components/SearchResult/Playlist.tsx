<<<<<<< HEAD
import React from 'react';
import styles from './SearchResult.module.css';
=======
import React, { useState } from 'react';
import styles from './Styles.module.css';
>>>>>>> 2e348c2e87cdbb915edb247c41480c20d8733ee2
import { IPlaylist } from '../../../../shared';
import { Link } from 'react-router-dom';

export interface IPlaylistProps {
    info: IPlaylist;
}
export const Playlist: React.FC<IPlaylistProps> = ({ info }) => {
<<<<<<< HEAD
    const to = `/playlist/${info.id}`;
=======
    const to = `/playlist?id=${info.id}`;
>>>>>>> 2e348c2e87cdbb915edb247c41480c20d8733ee2

    return (
        <Link to={to}>
            <div className={styles.container}>
                <div className={styles.imageContainer}>
                    <img className={styles.image} src={info.imageUrl} />
                </div>
                <div className={styles.info}>
                    <p className={styles.white}>{info.name}</p>
                    <p>{info.tracksCount} {getLabel(info.tracksCount)}</p>
                </div>
            </div>
        </Link>
    )
}

export function getLabel(count: number): string {
    if (count % 100 >= 11 && count % 100 <= 14) return 'треков';
    else if (count % 10 === 1) return 'трек';
    else if (count % 10 >= 2 && count % 10 <= 4) return 'трека';
    else return 'треков';
}