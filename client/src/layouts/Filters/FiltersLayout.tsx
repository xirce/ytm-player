import React from 'react';
import { Filters} from "../../components/Filters/Filters";
import { Outlet } from 'react-router-dom';

export const FiltersLayout = () => {
    return (
        <>
            <Filters/>
            <Outlet />
        </>
    )
}