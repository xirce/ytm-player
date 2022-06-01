import React from 'react';
import { useSearchParams, NavLink, Link } from 'react-router-dom';
import styles from './Filters.module.css';
import './active.css';

export const Filters: React.FC = () => {
    const [params, _] = useSearchParams();
    const query = params.get('q') ?? '';

    const getPath = (type: string) => `/search${type ? `/${type}` : ''}?q=${query}`;

    return (
        <div className={styles.container}>
            <NavLink className={styles.item} to={getPath('tracks')}>Треки</NavLink>
            <NavLink className={styles.item} to={getPath('albums')}>Альбомы</NavLink>
            <NavLink className={styles.item} to={getPath('artists')}>Артисты</NavLink>
            <NavLink className={styles.item} to={getPath('playlists')}>Плейлисты</NavLink>
            <Link className={styles.item} to={getPath('')}>Показать всё</Link>
        </div>
    )
} 
