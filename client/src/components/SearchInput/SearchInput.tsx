import React, {useRef, useState} from 'react';
import {InputBase} from "@mui/material";
import styles from './SearchInput.module.css';

export interface SearchInputProps {
    onSearch?: (query: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({onSearch}) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>();

    return (
        <InputBase
            className={styles.field}
            type='search'
            placeholder='Поиск...'
            inputRef={element => inputRef.current = element as HTMLInputElement}
            onInput={event => setQuery((event.target as HTMLInputElement).value)}
            onKeyDown={event => event.key === 'Enter' && onSearch && onSearch(query)}
        />);
}