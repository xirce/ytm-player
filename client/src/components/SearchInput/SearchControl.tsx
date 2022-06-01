import React from 'react';
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AutocompleteSearchInput } from "./AutocompleteSearchInput";

export const SearchControl: React.FC = () => {
    const [params, _] = useSearchParams();
    const query = params.get('q') ?? '';
    const navigate = useNavigate();
    const location = useLocation();

    const handleSearch = (query: string) => {
        let pathName = location.pathname;
        if (!pathName.startsWith('/search')) {
            pathName = '/search';
        }
        navigate(`${pathName}?q=${query}`);
    }

    return <AutocompleteSearchInput onSearch={handleSearch} value={query} />;
};