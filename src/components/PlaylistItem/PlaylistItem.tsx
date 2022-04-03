import React, {useContext} from 'react';
import {Link} from 'react-router-dom';
import Box from "@mui/material/Box";
import NameContext from '../../context/PlaylistNameContext';
import styles from './PlaylistItem.module.css';

export interface IPlaylistItemProps {
    name: string;
    link: string;
}

export const PlaylistItem: React.FC<IPlaylistItemProps> = ({name, link}: IPlaylistItemProps) => {
    const value = useContext(NameContext);
    return (
        <Link to="/playlist" onClick={() => value.setPlaylistName(name)}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <Box className={styles.image}/>
                    <p>{name}</p>
                </div>
            </div>
        </Link>
    );
}