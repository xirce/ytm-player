import React from 'react';
import { IAlbumInfo } from '../../../../shared';
import { PlaylistBase } from './PlaylistBase';

export interface IAlbumProps {
    info: IAlbumInfo;
}

export const Album: React.FC<IAlbumProps> = React.memo(({ info }) => {
    return <PlaylistBase info={info} link={`/album/${info.id}`} />;
});