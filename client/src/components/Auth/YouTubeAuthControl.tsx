import React, { useEffect } from 'react';
import {
    useGetYouTubeAuthStatusQuery,
    useSignOutYouTubeMutation,
    useStartYouTubeAuthenticationMutation
} from '../../apiClient';
import styles from './YouTubeAuthControl.module.css';

export const YouTubeAuthControl: React.FC = () => {
    const { data, refetch, isFetching } = useGetYouTubeAuthStatusQuery();
    const [startAuthentication, startState] = useStartYouTubeAuthenticationMutation();
    const [signOut, signOutState] = useSignOutYouTubeMutation();

    useEffect(() => {
        if (!['pending', 'starting', 'restoring'].includes(data?.status ?? '')) return;
        const checkAfterSignIn = () => { void refetch(); };
        window.addEventListener('focus', checkAfterSignIn);
        return () => window.removeEventListener('focus', checkAfterSignIn);
    }, [data?.status, refetch]);

    const start = async () => {
        await startAuthentication().unwrap();
        void refetch();
    };

    const logout = async () => {
        await signOut().unwrap();
        void refetch();
    };

    if (data?.status === 'authenticated') {
        if (data.method === 'cookie') {
            return <span className={styles.cookie}>YouTube Music подключён</span>;
        }
        return (
            <button className={styles.button} onClick={logout} disabled={signOutState.isLoading}>
                Выйти из YouTube
            </button>
        );
    }

    if (data?.status === 'pending') {
        return (
            <div className={styles.pending}>
                <span>Код: <strong>{data.userCode}</strong></span>
                <a href={data.verificationUrl} target="_blank" rel="noreferrer">Открыть YouTube</a>
                <button className={styles.button} onClick={() => void refetch()} disabled={isFetching}>
                    Проверить вход
                </button>
            </div>
        );
    }

    return (
        <div className={styles.auth}>
            <button
                className={styles.button}
                onClick={start}
                disabled={startState.isLoading || data?.status === 'starting' || data?.status === 'restoring'}
            >
                Войти через YouTube
            </button>
            {data?.status === 'error' && <span className={styles.error}>{data.error}</span>}
        </div>
    );
};
