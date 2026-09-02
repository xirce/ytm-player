import React, { useEffect, useRef, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/dist/query';
import {
    useGetHomeQuery,
    useGetYouTubeAuthStatusQuery,
    useLazyGetHomeContinuationQuery
} from '../../apiClient';
import { IHomeSection } from '../../../../shared';
import { Track } from '../../components/Track/Track';
import { Album } from '../../components/SearchResult/Album';
import { Playlist } from '../../components/SearchResult/Playlist';
import { Artist } from '../../components/SearchResult/Artist';
import styles from './Home.module.css';

const HomeSection: React.FC<{ section: IHomeSection }> = ({ section }) => {
    const isQuickPicks = /quick\s*picks|рекомендуем|быстр(?:ый|ые)\s+(?:выбор|подборк)/i.test(section.title);
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
                            return <Track
                                source={tracks}
                                index={tracks.indexOf(item.data)}
                                showPlayCount
                                showDuration={!isQuickPicks}
                                compactPlayCount={isQuickPicks}
                                mobileCard
                                key={`track-${item.data.id}-${index}`}
                            />;
                        case 'album':
                            return <Album info={item.data} mobileCard key={`album-${item.data.id}-${index}`} />;
                        case 'playlist':
                            return <Playlist info={item.data} mobileCard key={`playlist-${item.data.id}-${index}`} />;
                        case 'artist':
                            return <Artist info={item.data} mobileCard key={`artist-${item.data.id}-${index}`} />;
                    }
                })}
            </div>
        </section>
    );
};

const isQuickPicksSection = (section: IHomeSection): boolean =>
    /quick\s*picks|рекомендуем|быстр(?:ый|ые)\s+(?:выбор|подборк)/i.test(section.title);

const mergeSections = (current: IHomeSection[], incoming: IHomeSection[]): IHomeSection[] => {
    const knownTitles = new Set(current.map(section => section.title.trim().toLocaleLowerCase('ru-RU')));
    const merged = [
        ...current,
        ...incoming.filter(section => {
            const key = section.title.trim().toLocaleLowerCase('ru-RU');
            if (knownTitles.has(key)) return false;
            knownTitles.add(key);
            return true;
        })
    ];
    const quickPicksIndex = merged.findIndex(isQuickPicksSection);
    if (quickPicksIndex <= 0) return merged;
    return [merged[quickPicksIndex], ...merged.slice(0, quickPicksIndex), ...merged.slice(quickPicksIndex + 1)];
};

export const HomePage: React.FC = () => {
    const auth = useGetYouTubeAuthStatusQuery();
    const isAuthenticated = auth.data?.status === 'authenticated';
    const canLoadRecommendations = auth.data?.status === 'authenticated'
        && auth.data.musicRecommendationsAvailable;
    const home = useGetHomeQuery(canLoadRecommendations ? undefined : skipToken);
    const [loadContinuation, continuationState] = useLazyGetHomeContinuationQuery();
    const [sections, setSections] = useState<IHomeSection[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        setSections(home.data?.sections ?? []);
        setContinuation(home.data?.continuation ?? null);
    }, [home.data]);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || !continuation) return;

        const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting || loadingRef.current) return;
            loadingRef.current = true;
            void loadContinuation(continuation, true)
                .unwrap()
                .then(page => {
                    setSections(current => mergeSections(current, page.sections));
                    setContinuation(page.continuation);
                })
                .catch(() => setContinuation(null))
                .finally(() => { loadingRef.current = false; });
        }, { rootMargin: '400px 0px' });
        observer.observe(target);
        return () => observer.disconnect();
    }, [continuation, loadContinuation]);

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
    if (!sections.length) return <h1>Рекомендации пока пусты</h1>;

    return (
        <main className={styles.container}>
            {sections.map((section, index) => (
                <HomeSection section={section} key={`${section.title}-${index}`} />
            ))}
            <div className={styles.loadMore} ref={loadMoreRef}>
                {continuationState.isFetching && 'Загружаем ещё рекомендации...'}
                {continuationState.isError && 'Не удалось загрузить следующие рекомендации'}
            </div>
        </main>
    );
};
