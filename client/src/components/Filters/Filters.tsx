import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Filters.module.css';

export const Filters: React.FC = () => {
    const navigate = useNavigate();
    const [params, _] = useSearchParams();
    const query = params.get('q') ?? '';

    const find = (type: string) => {
        navigate(`/search/${type}?q=${query}`);
    }

    return (
        <div className={styles.container}>
            <div className={styles.item} onClick={() => find('tracks')}>Треки</div>
            <div className={styles.item} onClick={() => find('albums')}>Альбомы</div>
            <div className={styles.item} onClick={() => find('artists')}>Артисты</div>
            <div className={styles.item} onClick={() => find('playlists')}>Плейлисты</div>
        </div>
    )
} 
