import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import Box from "@mui/material/Box";
import NameContext from '../../context/PlaylistNameContext';
export interface IElem {
    name: string;
    link: string;
}

export const PlaylistElem: React.FC<IElem> = ({ name, link }: IElem) => {
    const value = useContext(NameContext);
    return (
        <div style={{ display: 'flex', margin: '10px' }}>
            <div style={{ backgroundColor: 'white', padding: '10px' }}>
                <Link to="/playlist" onClick={() => value.setPlaylistName(name)}>
                    <Box sx={{
                        width: 150,
                        height: 150,
                        backgroundColor: 'black'
                    }} />
                    <p>{name}</p>
                </Link>
            </div>
        </div>
    );
}