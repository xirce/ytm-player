import React from 'react';
import { Filters} from "../../components/Filters/Filters";
import { Outlet } from 'react-router-dom';
import { SearchControl } from '../../components/SearchInput/SearchControl';
import styles from './FiltersLayout.module.css';

export const FiltersLayout = () => {
    return (
        <>
            <div className={styles.mobileSearch}>
                <SearchControl />
            </div>
            <Filters/>
            <Outlet />
        </>
    )
}
