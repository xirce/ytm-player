import React from 'react';
import Stack from "@mui/material/Stack";
import { PlaylistInfo } from '../PlaylistInfo/PlaylistInfo';
import { IAlbumInfo, IPlaylistInfo } from '../../../../shared';
import { MobileStickyHeader } from '../MobileStickyHeader/MobileStickyHeader';
import styles from "./PlaylistHeader.module.css";

export interface IPlaylistHeaderProps {
    info: IPlaylistInfo | IAlbumInfo;
}

export const PlaylistHeader: React.FC<IPlaylistHeaderProps> = React.memo(({ info }) => {
    return (
        <MobileStickyHeader title={info.name}>
            <Stack className={styles.container} direction='column' alignItems='center'>
                <div className={styles.imageContainer}>
                    <img className={styles.image} src={info.imageUrl} alt={info.name} referrerPolicy="no-referrer" />
                </div>
                <div>
                    <h2>{info.name}</h2>
                    <PlaylistInfo source={info} centered />
                </div>
            </Stack>
        </MobileStickyHeader>
    );
});
