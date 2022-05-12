import React from "react";
import Box from "@mui/material/Box";
import { getLabel } from '../../components/SearchResult/Playlist';
import { getPlaylist } from '../../apiClient';
import { List } from '../../components/List/List';
import { useQuery } from "react-query";
import { useParams } from "react-router-dom";
import styles from './Playlist.module.css';
import { Track } from '../../components/Track/Track';

async function getPlaylistInfo(id: string) {
    const response = await getPlaylist(id);
    return response.data;
}

export const PlaylistPage: React.FC = () => {
    const { id } = useParams();
    const { isLoading, data } = useQuery(['playlist', id], async () => await getPlaylistInfo(id as string));
    if (isLoading) {
        return <h1 style={{ color: 'white' }}>ЗАГРУЖАЮ...</h1>
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', color: 'white', flexWrap: 'wrap', gap: '20px' }}>
                <div className={styles.imageContainer}>
                    <img className={styles.image} src={data[0].thumbnails[0].url} style={{ width: '192px', height: '192px' }} />
                </div>
                <div className="description">
                    <h2>{data[0].name}</h2>
                    <p>{data[0].videoCount} {getLabel(data[0].videoCount)}</p>
                </div>
            </div>
            <div className={styles.tracks}>
                <List title='Список треков' source={data[1]} renderItem={track => <Track info={track} key={track.id} />} />
            </div>
        </div>
    );
}