import React from 'react';
import { IAlbumInfo, IPlaylistInfo } from '../../../../shared';
import { getCountDeclination } from '../../utils/formatting';
import { ArtistLink } from '../ArtistLink/ArtistLink';
import styles from './PlaylistInfo.module.css';

export interface IPlaylistInfoProps {
    source: IPlaylistInfo | IAlbumInfo;
    centered?: boolean;
}

export const PlaylistInfo: React.FC<IPlaylistInfoProps> = React.memo(({ source, centered = false }) => {
    const className = `${styles.content} ${centered ? styles.centered : ''}`;
    const count = source.trackCount === null
        ? null
        : `${source.trackCount} ${getCountDeclination(source.trackCount, ['трек', 'трека', 'треков'])}`;

    if ('artist' in source) {
        const albumInfo = source as IAlbumInfo;
        return (
            <div className={className}>
                <ArtistLink info={albumInfo.artist} />
                {albumInfo.year !== null && <span>{albumInfo.year}</span>}
                {count && <span>{count}</span>}
            </div>
        )
    }

    return (
        <div className={className}>
            {count && <span>{count}</span>}
        </div >
    );
});
