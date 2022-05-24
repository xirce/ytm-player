import React from 'react';
import { useAppSelector } from "../../store";
import { getTracks } from "../../store/player";
import { TrackList } from "../../components/TrackList/TrackList";

export const QueuePage: React.FC = React.memo(() => {
    const tracks = useAppSelector(getTracks);

    if (!tracks?.length) {
        return <h1>Пусто</h1>;
    }

    return <TrackList title={'Очередь'} source={tracks} />;
});