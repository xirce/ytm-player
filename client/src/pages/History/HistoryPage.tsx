import React from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useGetHistoryQuery, useGetYouTubeAuthStatusQuery } from '../../apiClient';
import { TrackList } from '../../components/TrackList/TrackList';

export const HistoryPage: React.FC = React.memo(() => {
    const auth = useGetYouTubeAuthStatusQuery();
    const canLoadHistory = auth.data?.status === 'authenticated'
        && auth.data.musicRecommendationsAvailable;
    const history = useGetHistoryQuery(canLoadHistory ? undefined : skipToken);

    if (auth.isLoading || auth.data?.status === 'restoring') {
        return <h1>Загружаем историю...</h1>;
    }
    if (!canLoadHistory) {
        return (
            <main>
                <h1>История прослушиваний</h1>
                <p>Для просмотра истории подключите YouTube Music с cookie-авторизацией.</p>
            </main>
        );
    }
    if (history.isLoading || history.isFetching) return <h1>Загружаем историю...</h1>;
    if (history.error) return <h1>Не удалось загрузить историю прослушиваний</h1>;
    if (!history.data?.length) return <h1>История прослушиваний пока пуста</h1>;

    return (
        <main>
            <TrackList title="История прослушиваний" source={history.data} />
        </main>
    );
});
