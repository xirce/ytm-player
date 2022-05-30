import React from 'react';
import { useParams } from 'react-router-dom';
import { TrackList } from '../../components/TrackList/TrackList';
import { useGetRadioQuery } from '../../apiClient';

export const RadioPage: React.FC = () => {
    const { id } = useParams();
    const { data: tracks, isLoading } = useGetRadioQuery(id as string);

    if (isLoading) {
        return <h1>Загружаю...</h1>;
    }

    if (!tracks) {
        return <h1>Что-то пошло не так</h1>;
    }

    return (
        <TrackList title='Радио' source={tracks} />
    );
}