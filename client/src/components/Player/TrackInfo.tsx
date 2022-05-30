import React from 'react';
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import { ArtistLink } from '../ArtistLink/ArtistLink';
import { ITrackBase } from '../../../../shared';
import styles from "./TrackInfo.module.css";

export interface ITrackInfoProps {
    source: ITrackBase;
}

export const TrackInfo: React.FC<ITrackInfoProps> = React.memo(({ source }) => {
    return (
        <Grid container item xs justifyContent='left' alignItems='center' wrap='nowrap' gap={2} direction='row'>
            <Grid item width='60px' height='60px'>
                {source?.imageUrl && <img className={styles.image} src={source?.imageUrl} />}
            </Grid>
            <Grid item>
                <Stack direction='column' alignItems='start'>
                    <span className={styles.title} title={source?.title ?? ''}>
                        {source?.title ?? 'Название трека'}
                    </span>
                    <span className={styles.artist}>
                        {source ? <ArtistLink info={source.artist} /> : 'Артист'}
                    </span>
                </Stack>
            </Grid>
        </Grid>
    );
});