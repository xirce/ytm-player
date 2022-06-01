import React, { useState } from 'react';
import { Autocomplete, InputBase, TextField } from "@mui/material";
import { ISearchInputProps } from "./SearchInput";
import { useGetSearchSuggestionsQuery } from "../../apiClient";
import styles from './AutocompleteSearchInput.module.css';


export const AutocompleteSearchInput: React.FC<ISearchInputProps> = ({ value, onSearch }) => {
    const [query, setQuery] = useState('');
    const { data: suggestions } = useGetSearchSuggestionsQuery(query, { skip: !query });

    return (
        <Autocomplete
            freeSolo
            id="autocomplete-search"
            classes={{
                inputRoot: styles.inputRoot,
                paper: styles.paper,
                clearIndicator: styles.clearIndicator
            }}
            options={suggestions || []}
            defaultValue={value}
            onChange={((_, newValue) =>
                newValue && onSearch && onSearch(newValue))}
            renderInput={(params) => (
                <TextField
                    {...params}
                    onInput={event => setQuery((event.target as HTMLInputElement).value)}
                    onKeyDown={event => event.key === 'Enter' && query && onSearch && onSearch(query)}
                    placeholder={'Поиск'}
                />
            )}
        />
    );
}