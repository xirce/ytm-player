import React from 'react';
import { IAlbumInfo, IPlaylistInfo } from '../../../../shared';
import { getCountDeclination } from '../../utils/formatting';
import { ArtistLink } from '../ArtistLink/ArtistLink';
import styles from './PlaylistInfo.module.css';

export interface IPlaylistInfoProps {
    source: IPlaylistInfo | IAlbumInfo;
}

export const PlaylistInfo: React.FC<IPlaylistInfoProps> = React.memo(({ source }) => {
    if ((source as IAlbumInfo).year) {
        const albumInfo = source as IAlbumInfo;
        return (
            <div className={styles.content}>
                <ArtistLink info={albumInfo.artist} />
                <span>{albumInfo.year}</span>
            </div>
        )
    }

    const playlistInfo = source as IPlaylistInfo;

    return (
        <div className={styles.content}>
            <span>{playlistInfo.tracksCount + ' ' + getCountDeclination(playlistInfo.tracksCount, ['трек', 'трека', 'треков'])}</span>
        </div >
    );
});