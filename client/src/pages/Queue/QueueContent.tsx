import React, { useRef } from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import DraggableList from 'react-draggable-list';
import { QueueTrack } from '../../components/Track/QueueTrack';
import { ITrackProps } from '../../components/Track/Track';
import { useAppAction, useAppSelector } from '../../store';
import { getAutoplay, getAutoplaySource, getCurrentTrack, getTrackListItems } from '../../store/player';
import styles from './QueueContent.module.css';

interface QueueContentProps {
    embedded?: boolean;
}

export const QueueContent: React.FC<QueueContentProps> = React.memo(({ embedded = false }) => {
    const { setTracks, setTrackIndex, setAutoplay } = useAppAction();
    const trackListItems = useAppSelector(getTrackListItems);
    const currentTrack = useAppSelector(getCurrentTrack);
    const autoplay = useAppSelector(getAutoplay);
    const autoplaySource = useAppSelector(getAutoplaySource);
    const containerRef = useRef<HTMLDivElement>(null);

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
            <div ref={containerRef} className={styles.list}>
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
