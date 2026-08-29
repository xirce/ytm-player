import React from 'react';
import { skipToken } from '@reduxjs/toolkit/dist/query';
import { useGetHomeQuery, useGetYouTubeAuthStatusQuery } from '../../apiClient';
import { IHomeSection } from '../../../../shared';
import { Track } from '../../components/Track/Track';
import { Album } from '../../components/SearchResult/Album';
import { Playlist } from '../../components/SearchResult/Playlist';
import { Artist } from '../../components/SearchResult/Artist';
import styles from './Home.module.css';

const HomeSection: React.FC<{ section: IHomeSection }> = ({ section }) => {
    const tracks = section.items
        .filter((item): item is Extract<typeof item, { type: 'track' }> => item.type === 'track')
        .map(item => item.data);

    return (
        <section className={styles.section}>
            <h2>{section.title}</h2>
            <div className={styles.items}>
                {section.items.map((item, index) => {
                    switch (item.type) {
                        case 'track':
                            return <Track source={tracks} index={tracks.indexOf(item.data)} showPlayCount key={`track-${item.data.id}-${index}`} />;
                        case 'album':
                            return <Album info={item.data} key={`album-${item.data.id}-${index}`} />;
                        case 'playlist':
                            return <Playlist info={item.data} key={`playlist-${item.data.id}-${index}`} />;
                        case 'artist':
                            return <Artist info={item.data} key={`artist-${item.data.id}-${index}`} />;
                    }
                })}
            </div>
        </section>
    );
};

export const HomePage: React.FC = () => {
    const auth = useGetYouTubeAuthStatusQuery(undefined, { pollingInterval: 2000 });
    const isAuthenticated = auth.data?.status === 'authenticated';
    const canLoadRecommendations = auth.data?.status === 'authenticated'
        && auth.data.musicRecommendationsAvailable;
    const home = useGetHomeQuery(canLoadRecommendations ? undefined : skipToken);

    if (auth.isLoading || auth.data?.status === 'restoring') {
        return <h1>Загружаем рекомендации...</h1>;
    }
    if (!isAuthenticated) {
        return (
            <div className={styles.message}>
                <h1>Персональные рекомендации</h1>
                <p>Войдите в YouTube с помощью кнопки в шапке, чтобы открыть свою главную страницу.</p>
            </div>
        );
    }
    if (auth.data && auth.data.status === 'authenticated' && !auth.data.musicRecommendationsAvailable) {
        return (
            <div className={styles.message}>
                <h1>Для рекомендаций нужна cookie-авторизация</h1>
                <p>
                    Device OAuth больше не принимается персональными endpoint’ами YouTube Music.
                    Добавьте Cookie из авторизованного запроса music.youtube.com в
                    переменную YOUTUBE_MUSIC_COOKIE и перезапустите сервер.
                </p>
            </div>
        );
    }
    if (home.isLoading || home.isFetching) return <h1>Загружаем рекомендации...</h1>;
    if (home.error) return <h1>Не удалось загрузить рекомендации</h1>;
    if (!home.data?.sections.length) return <h1>Рекомендации пока пусты</h1>;

    return (
        <main className={styles.container}>
            {home.data.sections.map((section, index) => (
                <HomeSection section={section} key={`${section.title}-${index}`} />
            ))}
        </main>
    );
};
