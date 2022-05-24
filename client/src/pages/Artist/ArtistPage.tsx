import React from "react";
import { useParams } from "react-router-dom";
import { useGetArtistQuery } from '../../apiClient';
import { TrackList } from '../../components/TrackList/TrackList';
import { PlaylistItem } from "../../components/PlaylistItem/PlaylistItem";
import { ArtistHeader } from "../../components/ArtistHeader/ArtistHeader";
import styles from './Artist.module.css';

export const ArtistPage: React.FC = () => {
    const { id } = useParams();
    const { isLoading, data } = useGetArtistQuery(id as string);

    if (isLoading) {
        return <h1 style={{ color: 'white' }}>ЗАГРУЖАЮ...</h1>
    }

    if (!data) {
        return <h1>Что-то пошло не так</h1>
    }

    return (
        <>
            <div className={styles.container}>
                <ArtistHeader info={data.info} />
                <div className={styles.tracks}>
                    <TrackList title='Треки' source={data.tracks} />
                </div>
                <h2>Альбомы</h2>
                <div className={styles.list}>
                    {data.albums.map(album => (
                        <PlaylistItem info={album} key={album.id} />
                    ))}
                </div>
            </div>
        </>
    );
}