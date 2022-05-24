import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import { SearchInput } from "../SearchInput/SearchInput";
import styles from './Header.module.css';

const Header: React.FC = () => {
    const [params, _] = useSearchParams();
    const query = params.get('q') ?? '';
    const navigate = useNavigate();

    const handleSearch = (query: string) => {
        navigate(`/search?q=${query}`);
    }

    return (
        <header className={styles.container}>
            <Grid container
                  justifyContent='center'
                  alignItems='center'
                  direction='row'>
                <Grid item xs={4}>
                    <SearchInput onSearch={handleSearch} value={query}/>
                </Grid>
            </Grid>
        </header>
    );
}

export default Header;