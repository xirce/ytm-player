import Grid from '@mui/material/Grid';
import React, { useState } from 'react';
import { SearchInput } from '../../components/SearchInput/SearchInput';
import styles from './Search.module.css';
import { search } from '../../apiClient';
import { ITrackBase } from '../../../../shared';
import { List } from '../../components/List/List';
import { Track } from '../../components/Track/Track';


export const Search: React.FC = () => {
    const [searchResults, setSearchResults] = useState<ITrackBase[]>([]);

    const handleSearch = async (query: string) => {
        try {
            const results = await search(query);
            setSearchResults(results.data);
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <Grid container className={styles.container} justifyContent='stretch' alignItems='center' direction='column'>
            <Grid item style={{marginBottom: '16px', width: '800px'}}>
                <SearchInput onSearch={handleSearch} />
            </Grid>
            <Grid item>
                <List source={searchResults} renderItem={item => <Track info={item} key={item.id} />} />
            </Grid>
        </Grid>);
}