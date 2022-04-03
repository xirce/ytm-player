import Grid from '@mui/material/Grid';
import React from 'react';
import { SearchInput } from '../../components/SearchInput/SearchInput';

export const Search: React.FC = () => {
    return (
        <Grid container justifyContent='center' alignItems='center'>
            <SearchInput />
        </Grid>);
}