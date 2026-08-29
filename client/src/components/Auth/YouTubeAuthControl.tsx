import React from 'react';
import {
    useGetYouTubeAuthStatusQuery,
    useSignOutYouTubeMutation,
    useStartYouTubeAuthenticationMutation
} from '../../apiClient';
import styles from './YouTubeAuthControl.module.css';

export const YouTubeAuthControl: React.FC = () => {
    const { data, refetch } = useGetYouTubeAuthStatusQuery(undefined, { pollingInterval: 2000 });
    const [startAuthentication, startState] = useStartYouTubeAuthenticationMutation();
    const [signOut, signOutState] = useSignOutYouTubeMutation();

    const start = async () => {
        await startAuthentication().unwrap();
        void refetch();
    };

    const logout = async () => {
        await signOut().unwrap();
        void refetch();
    };

    if (data?.status === 'authenticated') {
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
