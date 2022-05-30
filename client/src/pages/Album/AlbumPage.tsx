import React from "react";
import { useParams } from "react-router-dom";
import { useGetAlbumQuery } from '../../apiClient';
import { TrackList } from "../../components/TrackList/TrackList";
import styles from './Album.module.css';
import { PlaylistHeader } from "../../components/PlaylistHeader/PlaylistHeader";


export const AlbumPage: React.FC = () => {
    const { id } = useParams();
    const { data, isLoading } = useGetAlbumQuery(id as string);

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