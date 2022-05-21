import React from 'react';
import { useSearchParams } from "react-router-dom";
import Stack from "@mui/material/Stack";
import { skipToken } from '@reduxjs/toolkit/dist/query';
import { List } from '../../components/List/List';
import { Playlist } from '../../components/SearchResult/Playlist';
import { Album } from '../../components/SearchResult/Album';
import { Artist } from '../../components/SearchResult/Artist';
import { TrackList } from "../../components/TrackList/TrackList";
import { useSearchQuery } from '../../apiClient';
import styles from './Search.module.css';


export const Search: React.FC = () => {
    const [params, _] = useSearchParams();
    const query = params.get('q') as string;
    const { data, error, isLoading } = useSearchQuery(query || skipToken);

    if (isLoading) {
        return <h1>Загружаю...</h1>;
    }

    if (error) {
        return <h1>Что-то пошло не так</h1>;
    }

    return (
        <Stack className={styles.container} justifyContent='left' alignItems='stretch' direction='column'>
            <List title='Артисты' source={data?.artists} renderItem={artist => <Artist info={artist}/>}/>
            <TrackList title='Треки' source={data?.tracks || []} />
            <List title='Плейлисты' source={data?.playlists || []} renderItem={pl => <Playlist info={pl} />} />
            <List title='Альбомы' source={data?.albums || []} renderItem={album => <Album info={album} />} />
        </Stack>
    );
}