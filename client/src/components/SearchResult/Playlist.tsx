import React, { useState } from 'react';
import styles from './Styles.module.css';
import { IPlaylist } from '../../../../shared';
import { Link } from 'react-router-dom';

export interface IPlaylistProps {
    info: IPlaylist;
}
export const Playlist: React.FC<IPlaylistProps> = ({ info }) => {
    const to = `/playlist?id=${info.id}`;

    return (
        <Link to={to}>
            <div className={styles.container}>
                <div className={styles.images}>
                    <img src={info.imageUrl} className={styles.image} />
                </div>
                <div className={styles.info}>
                    <p className={styles.white}>{info.name}</p>
                    <p>{info.tracksCount} {GetLabel(info.tracksCount)}</p>
                </div>
            </div>
        </Link>
    )
}

function GetLabel(count: number): string {
    if (count % 100 >= 11 && count % 100 <= 14) return 'треков';
    else if (count % 10 === 1) return 'трек';
    else if (count % 10 >= 2 && count % 10 <= 4) return 'трека';
    else return 'треков';
}