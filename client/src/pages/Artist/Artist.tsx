import React from "react";
import { getArtist } from '../../apiClient';
import { List } from '../../components/List/List';
import { useQuery } from "react-query";
import { useParams } from "react-router-dom";
import styles from './Artist.module.css';
import { Track } from '../../components/Track/Track';

async function getArtistInfo(id: string) {
    const response = await getArtist(id);
    return response.data;
}

export const Artist: React.FC = () => {
    const { id } = useParams();
    const { isLoading, data } = useQuery(['artist', id], async () => await getArtistInfo(id as string));
    if (isLoading) {
        return <h1 style={{ color: 'white' }}>ЗАГРУЖАЮ...</h1>
    }

    return (
        <div>

        </div>
    );
}