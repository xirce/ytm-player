import React from 'react';
import { useSearchParams, useParams } from "react-router-dom";
import Stack from "@mui/material/Stack";
import { useSearchQuery } from '../../apiClient';
import { Playlist } from '../../components/SearchResult/Playlist';
import { Album } from '../../components/SearchResult/Album';
import { Artist } from '../../components/SearchResult/Artist';
import { TrackList } from "../../components/TrackList/TrackList";
import { List } from '../../components/List/List';
import { IArtistInfo, IPlaylistInfo, ITrackBase, IAlbumInfo } from '../../../../shared';
import styles from './FilteredSearch.module.css';

export const FilteredSearch: React.FC = () => {
    const [params, _] = useSearchParams();
    const { type } = useParams();
    const query = params.get('q');
    const { data, isLoading } = useSearchQuery({ query: query as string, type: type as string });

    if (isLoading) {
        return <h1>Загружаю...</h1>;
    }

    console.log(data);

    if (type === 'artists' && data) {
        return <List title='Артисты' source={data as IArtistInfo[]} renderItem={artist => <Artist info={artist} />} />
    }

    if (type === 'playlists' && data) {
        return <List title='Плейлисты' source={data as IPlaylistInfo[]} renderItem={pl => <Playlist info={pl} />} />
    }

    if (type === 'tracks' && data) {
        return <TrackList title='Треки' source={data as ITrackBase[]} />
    }

    if (type === 'albums' && data) {
        return <List title='Альбомы' source={data as IAlbumInfo[]} renderItem={album => <Album info={album} />} />
    }

    return (
        <div>Что-то пошло не так</div>
    )
}