import React from 'react';
import Stack from "@mui/material/Stack";
import { PlaylistInfo } from '../PlaylistInfo/PlaylistInfo';
import { IAlbumInfo, IPlaylistInfo } from '../../../../shared';
import styles from "./PlaylistHeader.module.css";

export interface IPlaylistHeaderProps {
    info: IPlaylistInfo | IAlbumInfo;
}

export const PlaylistHeader: React.FC<IPlaylistHeaderProps> = React.memo(({ info }) => {
    return (
        <Stack className={styles.container} direction='row'>
            <div className={styles.imageContainer}>
                <img className={styles.image} src={info.imageUrl} />
            </div>
            <div>
                <h2>{info.name}</h2>
                <PlaylistInfo source={info} />
            </div>
        </Stack>
    );
});