import React from 'react';
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { ArtistLink } from '../ArtistLink/ArtistLink';
import { AlbumLink } from '../AlbumLink/AlbumLink';
import { ITrackBase } from '../../../../shared';
import styles from "./TrackInfo.module.css";

export interface ITrackInfoProps {
    source: ITrackBase;
    expanded?: boolean;
    sharedArtwork?: boolean;
}

export const TrackInfo: React.FC<ITrackInfoProps> = React.memo(({ source, expanded = false, sharedArtwork = false }) => {
    const imageUrl = expanded
        ? source?.imageUrls?.large ?? source?.imageUrl
        : source?.imageUrls?.small ?? source?.imageUrl;
    return (
        <Grid
            container item xs
            justifyContent={expanded ? 'center' : 'left'}
            alignItems='center'
            wrap='nowrap'
            gap={2}
            direction={expanded ? 'column' : 'row'}
            className={expanded ? styles.expanded : styles.mini}
        >
            <Grid item width='60px' height='60px' className={styles.imageContainer}
                data-player-artwork={sharedArtwork ? expanded ? 'full' : 'mini' : undefined}>
                {imageUrl && (
                    <img
                        className={styles.image}
                        src={imageUrl}
                        alt={source.title}
                        referrerPolicy="no-referrer"
                        draggable={false}
                        style={sharedArtwork ? { visibility: 'hidden' } : undefined}
                    />
                )}
            </Grid>
            <Grid item className={styles.infoContainer}>
                <Stack direction='column' alignItems={expanded ? 'center' : 'start'}>
                    <span className={styles.title} title={source?.title ?? ''}>
                        {source?.album?.id
                            ? <AlbumLink info={source.album}>{source.title}</AlbumLink>
                            : source?.title ?? 'Название трека'}
                    </span>
                    <span className={styles.artist}>
                        {source ? <ArtistLink info={source.artist} /> : 'Артист'}
                    </span>
                </Stack>
            </Grid>
        </Grid>
    );
});
