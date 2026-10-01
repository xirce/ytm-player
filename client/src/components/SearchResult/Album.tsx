import React from 'react';
import { IAlbumInfo } from '../../../../shared';
import { PlaylistBase } from './PlaylistBase';

export interface IAlbumProps {
    info: IAlbumInfo;
    mobileCard?: boolean;
}

export const Album: React.FC<IAlbumProps> = React.memo(({ info, mobileCard }) => {
    return <PlaylistBase info={info} link={`/album/${info.id}`} mobileCard={mobileCard} />;
});
