import React from 'react';
import styles from './SearchResult.module.css';
import { IArtistInfo } from '../../../../shared';
import { Link } from 'react-router-dom';

export interface IArtistProps {
    info: IArtistInfo;
}

export const Artist: React.FC<IArtistProps> = ({ info }) => {
    return (
        <Link to={`/artist/${info.id}`}>
            <div className={styles.container}>
                <div className={styles.imageContainer}>
                    <img className={styles.image} src={info.imageUrl} />
                </div>
                <div className={styles.info}>
                    <p className={styles.white}>{info.name}</p>
                </div>
            </div>
        </Link>
    )
}