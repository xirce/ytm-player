import React, { useCallback, useEffect, useRef, useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import IconButton from '@mui/material/IconButton';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { useSearchParams } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/dist/query';
import {
    useGetHomeQuery,
    useGetYouTubeAuthStatusQuery,
    useLazyGetHomeContinuationQuery,
    useLazyGetHomeSectionQuery
} from '../../apiClient';
import { IHomeItem, IHomeSection } from '../../../../shared';
import { Track } from '../../components/Track/Track';
import { Album } from '../../components/SearchResult/Album';
import { Playlist } from '../../components/SearchResult/Playlist';
import { Artist } from '../../components/SearchResult/Artist';
import styles from './Home.module.css';

const isListenAgainSection = (section: IHomeSection): boolean =>
    /послушать\s+ещ[её]\s+раз|слушать\s+снова|listen\s+again|speed\s+dial/i.test(section.title);

const uniqueItems = (items: IHomeItem[]): IHomeItem[] =>
    Array.from(new Map(items.map(item => [`${item.type}:${item.data.id}`, item])).values());

const PAGE_SIZE = 9;
const MAX_CAROUSEL_ITEMS = 27;
const LIST_BATCH_SIZE = 18;

const HomeSection: React.FC<{
    section: IHomeSection;
    compact?: boolean;
    expanded?: boolean;
    onToggle?: () => void;
}> = ({ section, compact, expanded, onToggle }) => {
    const [activePage, setActivePage] = useState(0);
    const carouselRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const [extraItems, setExtraItems] = useState<IHomeItem[]>([]);
    const [cursor, setCursor] = useState(section.continuation);
    const [visibleCount, setVisibleCount] = useState(LIST_BATCH_SIZE);
    const [loadSection, sectionRequest] = useLazyGetHomeSectionQuery();
    const loadingRef = useRef(false);
    const items = uniqueItems([...section.items, ...extraItems]);
    const carouselItems = items.slice(0, MAX_CAROUSEL_ITEMS);
    const pageCount = Math.ceil(carouselItems.length / PAGE_SIZE);

    useEffect(() => {
        setExtraItems([]);
        setCursor(section.continuation);
        setVisibleCount(LIST_BATCH_SIZE);
    }, [section]);

    useEffect(() => { setActivePage(0); }, [compact]);

    const loadMore = useCallback(() => {
        if (visibleCount < items.length) {
            setVisibleCount(count => count + LIST_BATCH_SIZE);
        }
        // Fetch while revealing the last buffered batch, not after it runs out.
        if (cursor && !loadingRef.current && visibleCount + LIST_BATCH_SIZE >= items.length) {
            loadingRef.current = true;
            void loadSection(cursor, true).unwrap().then(page => {
                loadingRef.current = false;
                setExtraItems(current => uniqueItems([...current, ...page.items]));
                setCursor(page.continuation);
                setVisibleCount(count => Math.max(count, visibleCount + LIST_BATCH_SIZE));
            }).catch(() => { loadingRef.current = false; });
        }
    }, [cursor, items.length, loadSection, visibleCount]);

    useEffect(() => {
        const target = endRef.current;
        if (!expanded || !target || sectionRequest.isError || (visibleCount >= items.length && !cursor)) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) loadMore();
        }, { rootMargin: '0px 0px 1200px 0px' });
        observer.observe(target);
        return () => observer.disconnect();
    }, [expanded, cursor, items.length, visibleCount, loadMore, sectionRequest.isError]);

    const goToPage = (page: number) => {
        const target = carouselRef.current;
        if (!target) return;
        const next = Math.max(0, Math.min(pageCount - 1, page));
        target.scrollTo({ left: next * target.clientWidth, behavior: 'smooth' });
    };

    const isQuickPicks = /quick\s*picks|рекомендуем|быстр(?:ый|ые)\s+(?:выбор|подборк)/i.test(section.title);
    const tracks = items
        .filter((item): item is Extract<typeof item, { type: 'track' }> => item.type === 'track')
        .map(item => item.data);

    const renderItem = (item: IHomeItem) => {
        const key = `${item.type}-${item.data.id}`;
        switch (item.type) {
            case 'track':
                return <Track source={tracks} index={tracks.indexOf(item.data)} showPlayCount
                    showDuration={!isQuickPicks} compactPlayCount={isQuickPicks} mobileCard key={key} />;
            case 'album': return <Album info={item.data} mobileCard key={key} />;
            case 'playlist': return <Playlist info={item.data} mobileCard key={key} />;
            case 'artist': return <Artist info={item.data} mobileCard key={key} />;
        }
    };

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeading}>
                {expanded && <IconButton onClick={onToggle} aria-label='Назад к разделам' color='inherit'>
                    <ArrowBackRounded />
                </IconButton>}
                <h2>{section.title}</h2>
                {compact && <IconButton onClick={onToggle} aria-label={`Показать все: ${section.title}`} color='inherit'>
                    <ChevronRightRounded />
                </IconButton>}
            </div>
            {compact ? <>
                <div className={styles.carousel} ref={carouselRef} role='region'
                    aria-label={`${section.title}: карусель`} aria-roledescription='карусель' tabIndex={0}
                    onScroll={event => {
                        const target = event.currentTarget;
                        if (target.clientWidth) setActivePage(Math.max(0, Math.min(pageCount - 1,
                            Math.round(target.scrollLeft / target.clientWidth))));
                    }}
                    onKeyDown={event => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                            event.preventDefault();
                            goToPage(activePage + (event.key === 'ArrowRight' ? 1 : -1));
                        }
                    }}>
                    {Array.from({ length: pageCount }, (_, page) => <div
                        className={`${styles.items} ${styles.listenAgainGrid}`} key={page}
                        data-cover-caption='true' role='group' aria-label={`Страница ${page + 1} из ${pageCount}`}>
                        {carouselItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(renderItem)}
                    </div>)}
                </div>
                <div className={styles.pageDots} aria-label='Страницы карусели'>
                    {Array.from({ length: pageCount }, (_, page) => <button key={page} type='button'
                        className={styles.pageDot} aria-label={`Страница ${page + 1}`}
                        aria-current={activePage === page ? 'page' : undefined} onClick={() => goToPage(page)} />)}
                </div>
            </> : <div className={styles.items}>
                {(expanded ? items.slice(0, visibleCount) : items).map(renderItem)}
            </div>}
            {expanded && <div ref={endRef} className={styles.loadMore} aria-live='polite'>
                {sectionRequest.isFetching && 'Загружаем ещё карточки...'}
                {sectionRequest.isError && <button type='button' onClick={loadMore}>
                    Не удалось загрузить карточки. Повторить
                </button>}
            </div>}
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
    const priority = (section: IHomeSection) => isListenAgainSection(section) ? 0 : isQuickPicksSection(section) ? 1 : 2;
    return merged.sort((left, right) => priority(left) - priority(right));
};

export const HomePage: React.FC = () => {
    const isMobile = useMediaQuery('(max-width:700px)');
    const [searchParams, setSearchParams] = useSearchParams();
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
    const mainRef = useRef<HTMLElement>(null);
    const expandedSection = isMobile && searchParams.get('section') === 'listen-again'
        ? sections.find(isListenAgainSection) : undefined;

    const toggleListenAgain = () => {
        const next = new URLSearchParams(searchParams);
        if (expandedSection) next.delete('section');
        else next.set('section', 'listen-again');
        setSearchParams(next);
    };

    useEffect(() => {
        if (expandedSection) mainRef.current?.scrollIntoView({ block: 'start' });
    }, [expandedSection]);

    useEffect(() => {
        setSections(mergeSections([], home.data?.sections ?? []));
        setContinuation(home.data?.continuation ?? null);
    }, [home.data]);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || !continuation || expandedSection) return;

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
    }, [continuation, loadContinuation, expandedSection]);

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
        <main className={styles.container} ref={mainRef}>
            {(expandedSection ? [expandedSection] : sections).map(section => (
                <HomeSection
                    section={section}
                    compact={isMobile && isListenAgainSection(section) && !expandedSection}
                    expanded={section === expandedSection}
                    onToggle={toggleListenAgain}
                    key={section.title}
                />
            ))}
            {!expandedSection && <div className={styles.loadMore} ref={loadMoreRef}>
                {continuationState.isFetching && 'Загружаем ещё рекомендации...'}
                {continuationState.isError && 'Не удалось загрузить следующие рекомендации'}
            </div>}
        </main>
    );
};
