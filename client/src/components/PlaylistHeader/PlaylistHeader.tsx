import React from 'react';
import Stack from "@mui/material/Stack";
import styles from "./PlaylistHeader.module.css";

export interface IPlaylistHeaderProps {
    title: string;
    imageUrl: string;
    rest?: string[];
}

export const PlaylistHeader: React.FC<IPlaylistHeaderProps> = React.memo(({ title, imageUrl, rest }) => {


    return (
        <Stack className={styles.container} direction='row'>
            <div className={styles.imageContainer}>
                <img className={styles.image} src={imageUrl}
                     style={{ width: '192px', height: '192px' }}/>
            </div>
            <div className="description">
                <h2>{title}</h2>
                <span>{rest?.join(' ')}</span>
            </div>
        </Stack>
    );
});