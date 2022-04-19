import Grid from '@mui/material/Grid';
import React, { useState } from 'react';
import { SearchInput } from '../../components/SearchInput/SearchInput';
import styles from './Search.module.css';
import { search } from '../../apiClient';
import { ITrackBase, IPlaylist, IAlbum } from '../../../../shared';
import { List } from '../../components/List/List';
import { Track } from '../../components/Track/Track';
import { Playlist } from '../../components/SearchResult/Playlist';
import { Album } from '../../components/SearchResult/Album';
 

export const Search: React.FC = () => {
    const [searchTracks, setSearchTracks] = useState<ITrackBase[]>([]);
    const [searchPlaylists, setSearchPlaylists] = useState<IPlaylist[]>([]);
    const [searchAlbums, setSearchAlbums] = useState<IAlbum[]>([]);

    const handleSearch = async (query: string) => {
        try {
            const results = await search(query);
            setSearchTracks(results.data[0]);
            setSearchPlaylists(results.data[1]);
            setSearchAlbums(results.data[2]);
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <Grid container className={styles.container} justifyContent='stretch' alignItems='center' direction='column'>
            <Grid item style={{marginBottom: '16px', width: '800px'}}>
                <SearchInput onSearch={handleSearch} />
            </Grid>
            <Grid item style={{width: '800px'}}>
                <List title='Треки' source={searchTracks} renderItem={item => <Track info={item} key={item.id} />} />
            </Grid>
            <Grid item style={{width: '800px'}}>
                <List title='Плейлисты' source={searchPlaylists} renderItem={pl => <Playlist info={pl} key={pl.id} />} />
            </Grid>
            <Grid item style={{width: '800px'}}>
                <List title='Альбомы' source={searchAlbums} renderItem={album => <Album info={album} key={album.id} />} />
            </Grid>
        </Grid>);
}