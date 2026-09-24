import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import styles from './MobileStickyHeader.module.css';

export interface IMobileStickyHeaderProps {
    title: string;
    headerClassName?: string;
}

export const MobileStickyHeader: React.FC<PropsWithChildren<IMobileStickyHeaderProps>> = ({
    title,
    headerClassName,
    children
}) => {
    const headerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const maxIntersectionRatioRef = useRef(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const header = headerRef.current;
        if (!header) return;

        setProgress(0);
        maxIntersectionRatioRef.current = 0;
        const observer = new IntersectionObserver(entries => {
            const entry = entries[0];
            const ratio = entry?.intersectionRatio ?? 1;
            maxIntersectionRatioRef.current = Math.max(maxIntersectionRatioRef.current, ratio);
            const initialRatio = maxIntersectionRatioRef.current;
            const headerHeight = entry?.boundingClientRect.height ?? 0;
            const panelRatio = headerHeight > 0
                ? (panelRef.current?.offsetHeight ?? 0) / headerHeight
                : 0;
            const fadeRange = initialRatio - panelRatio;
            const nextProgress = fadeRange > 0 ? (initialRatio - ratio) / fadeRange : 1;
            setProgress(Math.max(0, Math.min(nextProgress, 1)));
        }, {
            threshold: Array.from({ length: 101 }, (_, index) => index / 100)
        });

        observer.observe(header);
        return () => observer.disconnect();
    }, [title]);

    return (
        <>
            <div ref={headerRef} className={headerClassName}>{children}</div>
            <div
                ref={panelRef}
                className={styles.container}
                style={{ opacity: progress }}
                aria-label="Навигация по странице"
                aria-hidden={progress === 0}
            >
                <span aria-hidden="true" />
                <span className={styles.title}>{title}</span>
                <span aria-hidden="true" />
            </div>
        </>
    );
};
