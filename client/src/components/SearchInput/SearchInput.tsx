import React, { useState } from 'react';
import { InputBase } from "@mui/material";
import styles from './SearchInput.module.css';

export interface SearchInputProps {
    onSearch?: (query: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    return (
        <InputBase
            className={styles.field}
            type='search'
            placeholder='Поиск...'
            onInput={event => setQuery((event.target as HTMLInputElement).value)}
            onKeyDown={event => event.key === 'Enter' && onSearch && onSearch(query)}
        />
    );
}