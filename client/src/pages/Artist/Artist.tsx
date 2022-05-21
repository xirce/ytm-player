import React from "react";
import { useGetArtistQuery } from '../../apiClient';
import { useParams } from "react-router-dom";
import { TrackList } from '../../components/TrackList/TrackList';
import styles from './Artist.module.css';
import { Track } from '../../components/Track/Track';
import { PlaylistItem } from "../../components/PlaylistItem/PlaylistItem";

export const Artist: React.FC = () => {
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
            {/* <div className={styles.image}>
                <img src={data[0].thumbnails[2].url} style={{ width: '100%', height: '' }} />
            </div> */}
            <div className={styles.container}>
                <div className={styles.info}>
                    <h1>{data?.name}</h1>
                </div>
                <div className={styles.tracks}>
                    <TrackList title='Треки' source={data?.tracks} />
                </div>
                <div className={styles.albums}>
                    <h2>Альбомы</h2>
                    <div className={styles.list}>
                        {data.albums.map(album => (
                            <PlaylistItem info={album} key={album.id} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}