import React from "react";
import { useGetArtistQuery } from '../../apiClient';
import { useParams } from "react-router-dom";
import { List } from '../../components/List/List';
import styles from './Artist.module.css';
import { Track } from '../../components/Track/Track';

export const Artist: React.FC = () => {
    const { id } = useParams();
    const { isLoading, data } = useGetArtistQuery(id as string);

    if (isLoading) {
        return <h1 style={{ color: 'white' }}>ЗАГРУЖАЮ...</h1>
    }

    return (
        <div>

        </div>
    );
}