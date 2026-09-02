import React, { createRef } from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import { useAppAction, useAppSelector } from "../../store";
import { getAutoplay, getAutoplaySource, getTrackListItems } from "../../store/player";
import DraggableList from "react-draggable-list";
import { QueueTrack } from "../../components/Track/QueueTrack";
import { ITrackProps } from "../../components/Track/Track";

export const QueuePage: React.FC = React.memo(() => {
    const { setTracks, setAutoplay } = useAppAction();
    const trackListItems = useAppSelector(getTrackListItems);
    const autoplay = useAppSelector(getAutoplay);
    const autoplaySource = useAppSelector(getAutoplaySource);
    const containerRef = createRef<HTMLDivElement>();

    if (!trackListItems?.length) {
        return <h1>Пусто</h1>;
    }

    const handleListChange = (
        newList: ReadonlyArray<ITrackProps>,
        movedItem: ITrackProps,
        oldIndex: number,
        newIndex: number
    ) => {
        if (newIndex === oldIndex) return;

        const newTrackList = newList.map(item => item.source[item.index]);
        setTracks(newTrackList);
    }

    return (
        <>
            <h2>Очередь</h2>
            <FormControlLabel
                control={<Switch checked={autoplay} onChange={(_, value) => setAutoplay(value)} />}
                label="Автовоспроизведение"
            />
            {autoplay && autoplaySource && (
                <p>Радио построено на основе трека «<span style={{ fontWeight: 500 }}>{autoplaySource.title}</span>»</p>
            )}
            <div ref={containerRef}>
                <DraggableList<ITrackProps, void, QueueTrack>
                    unsetZIndex={true}
                    constrainDrag={true}
                    padding={16}
                    itemKey={item => item.index.toString()}
                    template={QueueTrack}
                    list={trackListItems}
                    onMoveEnd={handleListChange}
                    container={() => containerRef.current || document.body}
                />
            </div>
        </>
    );
});
