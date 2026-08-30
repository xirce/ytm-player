import React from 'react';
import { Link } from 'react-router-dom';
import { IArtistInfo } from '../../../../shared';
import styles from './SearchResult.module.css';

export interface IArtistProps {
    info: IArtistInfo;
    mobileCard?: boolean;
}

export const Artist: React.FC<IArtistProps> = React.memo(({ info, mobileCard }) => {
    return (
        <Link to={`/artist/${info.id}`}>
            <div className={`${styles.container} ${mobileCard ? styles.mobileCard : ''}`}>
                <div className={styles.content}>
                    <div className={styles.imageContainer}>
                        <img className={styles.image} src={info.imageUrl} alt={info.name} referrerPolicy="no-referrer" />
                    </div>
                    <div className={styles.infoContainer}>
                        <span className={styles.name}>{info.name}</span>
                    </div>
                </div>
            </div>
        </Link>
    )
});
