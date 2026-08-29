import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { ITrackBase } from '../../../../shared';

export interface IAlbumLinkProps {
    info: NonNullable<ITrackBase['album']>;
}

export const AlbumLink: React.FC<Omit<LinkProps, 'to'> & IAlbumLinkProps> = ({ info, ...rest }) => (
    <Link {...rest} to={`/album/${info.id}`}>
        {rest.children ?? info.name}
    </Link>
);
