import React from 'react';
import { Link } from 'react-router-dom';
import { IArtistInfo } from '../../../../shared';
import styles from './SearchResult.module.css';

export interface IArtistProps {
    info: IArtistInfo;
}

export const Artist: React.FC<IArtistProps> = React.memo(({ info }) => {
    return (
        <Link to={`/artist/${info.id}`}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.imageContainer}>
                        <img className={styles.image} src={info.imageUrl} />
                    </div>
                    <div className={styles.infoContainer}>
                        <span>{info.name}</span>
                    </div>
                </div>
            </div>
        </Link>
    )
});