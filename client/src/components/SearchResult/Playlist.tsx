import React from 'react';
import { Link } from 'react-router-dom';
import { IPlaylistInfo, IAlbumInfo } from '../../../../shared';
import { PlaylistInfo } from '../PlaylistInfo/PlaylistInfo';
import { PlaylistBase } from './PlaylistBase';

export interface IPlaylistProps {
    info: IPlaylistInfo;
}

export const Playlist: React.FC<IPlaylistProps> = React.memo(({ info }) => {
    const params = info.browseParams
        ? `?params=${encodeURIComponent(info.browseParams)}`
        : '';
    return <PlaylistBase info={info} link={`/playlist/${info.id}${params}`} />;
});
