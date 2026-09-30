import React from 'react';
import { Link } from 'react-router-dom';
import {
    useGetYouTubeAuthStatusQuery,
    useSignOutYouTubeMutation
} from '../../apiClient';
import styles from './YouTubeAuthControl.module.css';

export const YouTubeAuthControl: React.FC = () => {
    const { data } = useGetYouTubeAuthStatusQuery();
    const [signOut, signOutState] = useSignOutYouTubeMutation();

    const logout = async () => {
        await signOut().unwrap();
    };

    if (data?.status === 'authenticated') {
        return (
            <div className={styles.auth}>
                <Link className={styles.account} to='/account'>
                    {data.user.pictureUrl && <img src={data.user.pictureUrl} alt='' referrerPolicy='no-referrer' />}
                    <span>{data.user.name}</span>
                </Link>
                <button className={styles.button} onClick={logout} disabled={signOutState.isLoading}>Выйти</button>
            </div>
        );
    }

    return (
        <div className={styles.auth}>
            <a className={styles.button} href='/api/auth/google/start'>Войти через Google</a>
        </div>
    );
};
