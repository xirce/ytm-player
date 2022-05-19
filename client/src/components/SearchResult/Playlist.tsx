import React from 'react';
import { Link } from 'react-router-dom';
import { IPlaylistBase } from '../../../../shared';
import styles from './SearchResult.module.css';

export interface IPlaylistProps {
    info: IPlaylistBase;
}

export const Playlist: React.FC<IPlaylistProps> = ({ info }) => {
    return (
        <Link to={`/playlist/${info.id}`}>
            <div className={styles.container}>
                <div className={styles.imageContainer}>
                    <img className={styles.image} src={info.imageUrl}/>
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