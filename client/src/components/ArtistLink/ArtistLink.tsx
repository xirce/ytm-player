import React from "react";
import { Link, LinkProps } from 'react-router-dom';
import { IArtistInfoBase } from "../../../../shared";

export interface IArtistLinkProps {
    info: IArtistInfoBase;
}

export const ArtistLink: React.FC<IArtistLinkProps> = ({ info }) => {
    return (
        <Link to={`/artist/${info?.id}`}>
            {info?.name}
        </Link>
    )
}