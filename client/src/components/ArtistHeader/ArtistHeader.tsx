import React from 'react';
import { IArtistInfo } from "../../../../shared";
import { MobileStickyHeader } from '../MobileStickyHeader/MobileStickyHeader';
import styles from "./ArtistHeader.module.css";

export interface IArtistHeaderProps {
    info: IArtistInfo
}

export const ArtistHeader: React.FC<IArtistHeaderProps> = React.memo(({ info }) => {

    return (
        <MobileStickyHeader title={info.name} headerClassName={styles.container}>
            <div className={styles.imageContainer}>
                <img
                    className={styles.image}
                    src={info.imageUrl}
                    alt={info.name}
                    referrerPolicy="no-referrer"
                />
            </div>
            <div className={styles.info}>
                <h1 className={styles.name}>{info.name}</h1>
            </div>
        </MobileStickyHeader>
    );
});
