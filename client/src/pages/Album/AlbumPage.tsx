import React from "react";
import { getLabel } from '../../components/SearchResult/Playlist';
import { getAlbum } from '../../apiClient';
import { List } from '../../components/List/List';
import { useQuery } from "react-query";
import { useParams } from "react-router-dom";
import styles from './Album.module.css';
import { Track } from '../../components/Track/Track';

async function getAlbumInfo(id: string) {
    const response = await getAlbum(id);
    console.log(response.data);
    return response.data;
}

export const AlbumPage: React.FC = () => {
    const { id } = useParams();
    const { isLoading, data } = useQuery(['album', id], async () => await getAlbumInfo(id as string));
    if (isLoading) {
        return <h1 style={{ color: 'white' }}>ЗАГРУЖАЮ...</h1>
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', color: 'white', flexWrap: 'wrap', gap: '20px' }}>
                <div className={styles.imageContainer}>
                    <img className={styles.image} src={data[0].thumbnails[0].url} style={{ width: '192px', height: '192px' }} />
                </div>
                <div className={styles.description}>
                    <h2>{data[0].name}</h2>
                    <div className={styles.info}>
                        <p>Альбом</p>
                        <p> • </p>
                        <p>{data[0].artists[0].name}</p>
                        <p> • </p>
                        <p>{data[0].year}</p>
                    </div>
                    <div className={styles.info}>
                        <p>{data[1].length} {getLabel(data[0].videoCount)}</p>
                    </div>
                </div>
            </div>
            <div className={styles.tracks}>
                <List title='Список треков' source={data[1]} renderItem={track => <Track info={track} key={track.id} />} />
            </div>
        </div>
    );
}