import React, { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PlayerWrapper } from '../../components/Player/PlayerWrapper';
import Header from '../../components/Header';
import styles from './Layout.module.css';
import { Filters } from '../../components/Filters/Filters';

export const Layout: React.FC = () => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { pathname, search } = useLocation();

    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        container.scrollTop = 0;
        container.scrollLeft = 0;
    }, [pathname, search]);

    return (
        <>
            <Header />
            <div className={styles.container} ref={scrollContainerRef}>
                <div className={styles.content}>
                    <Outlet />
                </div>
            </div>
            <PlayerWrapper />
        </>
    );
}
