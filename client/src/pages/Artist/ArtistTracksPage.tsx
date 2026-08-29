import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    useGetArtistQuery,
    useGetArtistTracksQuery,
    useLazyGetArtistTracksContinuationQuery
} from '../../apiClient';
import { ITrackBase } from '../../../../shared';
import { ArtistHeader } from '../../components/ArtistHeader/ArtistHeader';
import { TrackList } from '../../components/TrackList/TrackList';
import styles from '../Playlist/Playlist.module.css';

export const ArtistTracksPage: React.FC = React.memo(() => {
    const { id = '' } = useParams();
    const artist = useGetArtistQuery(id);
    const firstPage = useGetArtistTracksQuery(id);
    const [loadContinuation, continuationState] = useLazyGetArtistTracksContinuationQuery();
    const [tracks, setTracks] = useState<ITrackBase[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const loadingMoreRef = useRef(false);

    useEffect(() => {
        setTracks(firstPage.data?.tracks ?? []);
        setContinuation(firstPage.data?.continuation ?? null);
    }, [firstPage.data]);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || !continuation || continuationState.isFetching || !id) return;

        const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting || loadingMoreRef.current) return;
            loadingMoreRef.current = true;
            void loadContinuation({ id, continuation }, true)
                .unwrap()
                .then(page => {
                    setTracks(current => {
                        const knownIds = new Set(current.map(track => track.id));
                        return [...current, ...page.tracks.filter(track => !knownIds.has(track.id))];
                    });
                    setContinuation(page.continuation);
                })
                .catch(() => undefined)
                .finally(() => { loadingMoreRef.current = false; });
        }, { rootMargin: '400px' });

        observer.observe(target);
        return () => observer.disconnect();
    }, [continuation, continuationState.isFetching, id, loadContinuation]);

    if (artist.isLoading || firstPage.isLoading) return <h1>Загружаем треки...</h1>;
    if (!artist.data || firstPage.isError) return <h1>Не удалось загрузить треки артиста</h1>;

    return (
        <main>
            <ArtistHeader info={artist.data.info} />
            <TrackList title="Все треки" source={tracks} />
            <div ref={loadMoreRef} className={styles.loadMore}>
                {continuationState.isFetching && 'Загружаем ещё треки...'}
                {continuationState.isError && 'Не удалось загрузить следующие треки'}
            </div>
        </main>
    );
});
