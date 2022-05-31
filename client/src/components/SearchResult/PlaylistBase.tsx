import React from 'react';
import { Link } from 'react-router-dom';
import { IPlaylistInfo, IAlbumInfo } from '../../../../shared';
import { ActionsControl } from '../Actions/ActionsControl';
import { PlayRadioAction } from '../Actions/PlayRadioAction';
import { PlaylistInfo } from '../PlaylistInfo/PlaylistInfo';
import styles from './SearchResult.module.css';

export interface IPlaylistBaseProps {
    info: IPlaylistInfo | IAlbumInfo;
    link: string;
}

export const PlaylistBase: React.FC<IPlaylistBaseProps> = React.memo(({ info, link }) => {
    return (
        <div className={styles.container}>
            <Link to={link}>
                <div className={styles.content}>
                    <div className={styles.imageContainer}>
                        <img className={styles.image} src={info.imageUrl} />
                    </div>
                    <div className={styles.infoContainer}>
                        <span className={styles.name}>{info.name}</span>
                        <PlaylistInfo source={info} />
                    </div>
                </div>
            </Link>
            <div className={styles.menuBtn}>
                <ActionsControl>
                    <PlayRadioAction source={info} />
                </ActionsControl>
            </div>
        </div>
    )
});