import React from "react";
import { useParams } from "react-router-dom";
import { useGetPlaylistQuery } from '../../apiClient';
import { TrackList } from "../../components/TrackList/TrackList";
import { PlaylistHeader } from "../../components/PlaylistHeader/PlaylistHeader";
import styles from './Playlist.module.css';

export const PlaylistPage: React.FC = () => {
    const { id } = useParams();
    const { data, isLoading } = useGetPlaylistQuery(id as string);

    if (isLoading) {
        return <h1>Загружаю...</h1>
    }

    if (!data) {
        return <h1>Что-то пошло не так</h1>
    }

    return (
        <>
            <PlaylistHeader title={data.name} imageUrl={data.imageUrl}/>
            <div className={styles.tracks}>
                <TrackList source={data?.tracks || []}/>
            </div>
        </>
    );
}