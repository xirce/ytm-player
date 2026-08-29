import React from 'react';
import { IAlbumInfo, IPlaylistInfo } from '../../../../shared';
import { getCountDeclination } from '../../utils/formatting';
import { ArtistLink } from '../ArtistLink/ArtistLink';
import styles from './PlaylistInfo.module.css';

export interface IPlaylistInfoProps {
    source: IPlaylistInfo | IAlbumInfo;
}

export const PlaylistInfo: React.FC<IPlaylistInfoProps> = React.memo(({ source }) => {
    const count = source.trackCount === null
        ? null
        : `${source.trackCount} ${getCountDeclination(source.trackCount, ['трек', 'трека', 'треков'])}`;

    if ('artist' in source) {
        const albumInfo = source as IAlbumInfo;
        return (
            <div className={styles.content}>
                <ArtistLink info={albumInfo.artist} />
                {albumInfo.year !== null && <span>{albumInfo.year}</span>}
                {count && <span>{count}</span>}
            </div>
        )
    }

    return (
        <div className={styles.content}>
            {count && <span>{count}</span>}
        </div >
    );
});
