import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useGetPlaylistQuery, useLazyGetPlaylistContinuationQuery } from '../../apiClient';
import { TrackList } from "../../components/TrackList/TrackList";
import { PlaylistHeader } from "../../components/PlaylistHeader/PlaylistHeader";
import styles from './Playlist.module.css';
import { ITrackBase } from '../../../../shared';

export const PlaylistPage: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { data, isLoading } = useGetPlaylistQuery({
        id: id as string,
        params: searchParams.get('params') ?? undefined
    });
    const [loadContinuation, continuationState] = useLazyGetPlaylistContinuationQuery();
    const [tracks, setTracks] = useState<ITrackBase[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const loadingMoreRef = useRef(false);

    useEffect(() => {
        setTracks(data?.tracks ?? []);
        setContinuation(data?.continuation ?? null);
    }, [data]);

    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target || !continuation || continuationState.isFetching || !id) return;

        const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting || loadingMoreRef.current) return;
            loadingMoreRef.current = true;
            void loadContinuation({ id, continuation }, true)
                .unwrap()
                .then(nextPage => {
                    setTracks(current => {
                        const knownIds = new Set(current.map(track => track.id));
                        return [...current, ...nextPage.tracks.filter(track => !knownIds.has(track.id))];
                    });
                    setContinuation(nextPage.continuation);
                })
                .catch(() => undefined)
                .finally(() => { loadingMoreRef.current = false; });
        }, { rootMargin: '400px' });

        observer.observe(target);
        return () => observer.disconnect();
    }, [continuation, continuationState.isFetching, id, loadContinuation]);

    if (isLoading) {
        return <h1>Загружаю...</h1>
    }

    if (!data) {
        return <h1>Что-то пошло не так</h1>
    }

    const { info } = data;

    return (
        <>
            <PlaylistHeader info={info} />
            <TrackList source={tracks || []} />
            <div ref={loadMoreRef} className={styles.loadMore}>
                {continuationState.isFetching && 'Загружаю ещё треки...'}
                {continuationState.isError && 'Не удалось загрузить следующие треки'}
            </div>
        </>
    );
}
