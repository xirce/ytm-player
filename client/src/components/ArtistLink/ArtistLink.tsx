import React from "react";
import { Link, LinkProps } from 'react-router-dom';
import { IArtistInfoBase } from "../../../../shared";

export interface IArtistLinkProps {
    info: IArtistInfoBase;
}

export const ArtistLink: React.FC<Omit<LinkProps, 'to'> & IArtistLinkProps> = ({ info, ...rest }) => {
    return (
        <Link {...rest} to={`/artist/${info?.id}`}>
            {info?.name}
        </Link>
    )
}