import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useGetPlaylistQuery } from '../../apiClient';
import { TrackList } from "../../components/TrackList/TrackList";
import { PlaylistHeader } from "../../components/PlaylistHeader/PlaylistHeader";
import styles from './Playlist.module.css';

export const PlaylistPage: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { data, isLoading } = useGetPlaylistQuery({
        id: id as string,
        params: searchParams.get('params') ?? undefined
    });

    if (isLoading) {
        return <h1>Загружаю...</h1>
    }

    if (!data) {
        return <h1>Что-то пошло не так</h1>
    }

    const { info, tracks } = data;

    return (
        <>
            <PlaylistHeader info={info} />
            <TrackList source={tracks || []} />
        </>
    );
}
