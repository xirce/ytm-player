import React from 'react';
import { useSearchParams, useParams } from "react-router-dom";
import { Playlist } from '../../components/SearchResult/Playlist';
import { Album } from '../../components/SearchResult/Album';
import { Artist } from '../../components/SearchResult/Artist';
import { TrackList } from "../../components/TrackList/TrackList";
import { List } from '../../components/List/List';
import { useSearchQuery } from '../../apiClient';
import { IArtistInfo, IPlaylistInfo, ITrackBase, IAlbumInfo } from '../../../../shared';

export const FilteredSearchPage: React.FC = () => {
    const [params, _] = useSearchParams();
    const { type } = useParams();
    const query = params.get('q');
    const { data, isFetching} = useSearchQuery({ query: query as string, type: type as string });

    if (isFetching) {
        return <h1>Загружаю...</h1>;
    }

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
        <h1>Что-то пошло не так</h1>
    )
}