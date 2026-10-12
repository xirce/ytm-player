import React, { useLayoutEffect, useRef } from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import DraggableList from 'react-draggable-list';
import { QueueTrack } from '../../components/Track/QueueTrack';
import { ITrackProps } from '../../components/Track/Track';
import { useAppAction, useAppSelector } from '../../store';
import { getAutoplay, getAutoplaySource, getCurrentTrack, getTrackListItems } from '../../store/player';
import styles from './QueueContent.module.css';

interface QueueContentProps {
    embedded?: boolean;
    autoScrollCurrent?: boolean;
    scrollToCurrentRequest?: number;
}

export const QueueContent: React.FC<QueueContentProps> = React.memo(({
    embedded = false,
    autoScrollCurrent = false,
    scrollToCurrentRequest = 0
}) => {
    const { setTracks, setTrackIndex, setAutoplay } = useAppAction();
    const trackListItems = useAppSelector(getTrackListItems);
    const currentTrack = useAppSelector(getCurrentTrack);
    const autoplay = useAppSelector(getAutoplay);
    const autoplaySource = useAppSelector(getAutoplaySource);
    const containerRef = useRef<HTMLDivElement>(null);
    const handledScrollRequestRef = useRef(0);
    const previousCurrentTrackIdRef = useRef(currentTrack?.id);

    useLayoutEffect(() => {
        const trackChanged = previousCurrentTrackIdRef.current !== currentTrack?.id;
        const requestChanged = handledScrollRequestRef.current !== scrollToCurrentRequest;
        previousCurrentTrackIdRef.current = currentTrack?.id;
        if (requestChanged) handledScrollRequestRef.current = scrollToCurrentRequest;
        if (!embedded || !autoScrollCurrent || !scrollToCurrentRequest || (!requestChanged && !trackChanged)) return;

        let frame = 0;
        const startScroll = () => {
            frame = requestAnimationFrame(() => {
            const container = containerRef.current;
            const current = container?.querySelector<HTMLElement>('[data-current-track="true"]');
            if (!container || !current) return;
            container.style.setProperty('--queue-scroll-tail', `${Math.max(0, container.clientHeight - current.offsetHeight)}px`);
            const from = container.scrollTop;
            const to = Math.max(0, from + current.getBoundingClientRect().top - container.getBoundingClientRect().top);
            const distance = to - from;
            const duration = Math.min(420, Math.max(220, Math.abs(distance) * 0.45));
            let startedAt: number | undefined;
            const animate = (time: number) => {
                startedAt ??= time;
                const progress = Math.min(1, (time - startedAt) / duration);
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                container.scrollTop = from + distance * eased;
                if (progress < 1) frame = requestAnimationFrame(animate);
            };
            frame = requestAnimationFrame(animate);
            });
        };
        const delay = requestChanged ? window.setTimeout(startScroll, 1000) : undefined;
        if (!requestChanged) startScroll();
        return () => {
            if (delay !== undefined) window.clearTimeout(delay);
            cancelAnimationFrame(frame);
        };
    }, [embedded, autoScrollCurrent, scrollToCurrentRequest, currentTrack?.id]);

    const handleListChange = (newList: ReadonlyArray<ITrackProps>, _movedItem: ITrackProps, oldIndex: number, newIndex: number) => {
        if (newIndex === oldIndex) return;
        const newTrackList = newList.map(item => item.source[item.index]);
        const nextCurrentIndex = newTrackList.findIndex(track => track.id === currentTrack?.id);
        setTracks(newTrackList);
        if (nextCurrentIndex >= 0) setTrackIndex(nextCurrentIndex);
    };

    if (!trackListItems.length) return <p className={styles.empty}>Очередь пуста</p>;

    return (
        <div className={embedded ? styles.embedded : undefined}>
            {!embedded && <div className={styles.heading}>
                <h2>Очередь</h2>
                <FormControlLabel
                    className={styles.autoplay}
                    control={<Switch checked={autoplay} onChange={(_, value) => setAutoplay(value)} />}
                    label='Автовоспроизведение'
                />
            </div>}
            {autoplay && autoplaySource && !embedded && (
                <p>Радио построено на основе трека «<strong>{autoplaySource.title}</strong>»</p>
            )}
            <div ref={containerRef} className={styles.list} data-player-queue-list>
                <DraggableList<ITrackProps, void, QueueTrack>
                    unsetZIndex
                    constrainDrag
                    padding={embedded ? 8 : 16}
                    itemKey={item => `${item.source[item.index]?.id ?? 'track'}-${item.index}`}
                    template={QueueTrack}
                    list={trackListItems}
                    onMoveEnd={handleListChange}
                    container={() => containerRef.current || document.body}
                />
            </div>
        </div>
    );
});
