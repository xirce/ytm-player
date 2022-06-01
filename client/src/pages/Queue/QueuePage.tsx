import React, { createRef } from 'react';
import { useAppAction, useAppSelector } from "../../store";
import { getCurrentTrack, getTrackIndex, getTrackListItems } from "../../store/player";
import DraggableList from "react-draggable-list";
import { QueueTrack } from "../../components/Track/QueueTrack";
import { ITrackProps } from "../../components/Track/Track";

export const QueuePage: React.FC = React.memo(() => {
    const { setTracks } = useAppAction();
    const trackListItems = useAppSelector(getTrackListItems);
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