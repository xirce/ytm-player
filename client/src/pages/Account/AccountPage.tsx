import React, { FormEvent, useState } from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LogoutIcon from '@mui/icons-material/Logout';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Navigate } from 'react-router-dom';
import {
    useConnectYouTubeMusicMutation,
    useDisconnectYouTubeMusicMutation,
    useGetYouTubeAuthStatusQuery,
    useGetYouTubeMusicConnectionQuery,
    useSignOutYouTubeMutation
} from '../../apiClient';
import styles from './AccountPage.module.css';

export const AccountPage: React.FC = () => {
    const auth = useGetYouTubeAuthStatusQuery();
    const connection = useGetYouTubeMusicConnectionQuery(undefined, {
        skip: auth.data?.status !== 'authenticated'
    });
    const [connect, connectState] = useConnectYouTubeMusicMutation();
    const [disconnect, disconnectState] = useDisconnectYouTubeMusicMutation();
    const [signOut, signOutState] = useSignOutYouTubeMutation();
    const [cookie, setCookie] = useState('');
    const [authUser, setAuthUser] = useState(0);
    const [pageId, setPageId] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showCookie, setShowCookie] = useState(false);

    if (auth.isLoading) return <main className={styles.container}><h1>Загружаем аккаунт...</h1></main>;
    if (auth.data?.status !== 'authenticated') return <Navigate to='/' replace />;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await connect({ cookie, authUser, pageId: pageId || undefined, language: 'ru' }).unwrap();
            setCookie('');
        } catch {
            // RTK Query exposes the validation error through connectState.
        }
    };
    const status = connection.data?.status ?? auth.data.musicConnection;
    const statusContent = status === 'connected'
        ? { label: 'Подключено', icon: <CheckCircleOutlineIcon /> }
        : status === 'error'
            ? { label: 'Требуется обновление', icon: <ErrorOutlineIcon /> }
            : { label: 'Не подключено', icon: <LinkOffIcon /> };
    const initial = (auth.data.user.name || auth.data.user.email).trim().charAt(0).toUpperCase();

    return (
        <main className={styles.container}>
            <header className={styles.profileHeader}>
                <div className={styles.identity}>
                    {auth.data.user.pictureUrl
                        ? <img className={styles.avatar} src={auth.data.user.pictureUrl} alt='' referrerPolicy='no-referrer' />
                        : <span className={styles.avatarFallback}>{initial}</span>}
                    <div>
                        <h1>{auth.data.user.name}</h1>
                        <p>{auth.data.user.email}</p>
                    </div>
                </div>
                <button
                    type='button'
                    className={styles.signOut}
                    disabled={signOutState.isLoading}
                    onClick={() => { void signOut(); }}
                >
                    <LogoutIcon />
                    <span>{signOutState.isLoading ? 'Выходим...' : 'Выйти'}</span>
                </button>
            </header>
            <section className={styles.connection}>
                <div className={styles.sectionHeading}>
                    <div>
                        <p className={styles.eyebrow}>Рекомендации и библиотека</p>
                        <h2>YouTube Music</h2>
                    </div>
                    <span className={styles.status} data-status={status}>
                        {statusContent.icon}
                        {statusContent.label}
                    </span>
                </div>
                <form onSubmit={submit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor='music-cookie'>Cookie YouTube Music</label>
                        <p className={styles.hint}>Хранится в зашифрованном виде и используется только для вашего аккаунта.</p>
                        <div className={styles.secretInput}>
                            <input
                                id='music-cookie'
                                type={showCookie ? 'text' : 'password'}
                                value={cookie}
                                onChange={event => setCookie(event.target.value)}
                                placeholder={status === 'connected' ? 'Вставьте новую cookie для замены' : 'Вставьте cookie из music.youtube.com'}
                                required
                                autoComplete='off'
                                spellCheck={false}
                            />
                            <button
                                type='button'
                                onClick={() => setShowCookie(value => !value)}
                                aria-label={showCookie ? 'Скрыть cookie' : 'Показать cookie'}
                                title={showCookie ? 'Скрыть cookie' : 'Показать cookie'}
                            >
                                {showCookie ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </button>
                        </div>
                    </div>
                    <button
                        type='button'
                        className={styles.advancedToggle}
                        aria-expanded={showAdvanced}
                        onClick={() => setShowAdvanced(value => !value)}
                    >
                        <ExpandMoreIcon />
                        <span>Дополнительные параметры</span>
                    </button>
                    {showAdvanced && <div className={styles.advanced}>
                        <label>Номер Google-аккаунта
                            <input type='number' min={0} value={authUser} onChange={event => setAuthUser(Number(event.target.value))} />
                        </label>
                        <label>Page ID
                            <input value={pageId} onChange={event => setPageId(event.target.value)} />
                        </label>
                    </div>}
                    <div className={styles.actions}>
                        <button type='submit' disabled={connectState.isLoading || !cookie.trim()}>
                            {connectState.isLoading ? 'Проверяем...' : status === 'connected' ? 'Обновить подключение' : 'Подключить'}
                        </button>
                        {status !== 'not_connected' && <button
                            type='button'
                            className={styles.disconnect}
                            disabled={disconnectState.isLoading}
                            onClick={() => { void disconnect(); }}
                        >
                            <LinkOffIcon />
                            {disconnectState.isLoading ? 'Отключаем...' : 'Отключить'}
                        </button>}
                    </div>
                    {connectState.isError && <p className={styles.error}><ErrorOutlineIcon /> Cookie не прошла проверку YouTube Music.</p>}
                </form>
            </section>
        </main>
    );
};
