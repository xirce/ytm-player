import React from 'react';
import { Track } from "../Track/Track";
import { List } from "../List/List";
import { ITrackBase } from "../../../../shared";
import { useAppSelector } from "../../store";
import { getCurrentTrack, getTrackIndex } from "../../store/player";

export interface ITrackListProps {
    title?: string;
    source: ITrackBase[];
}

export const TrackList: React.FC<ITrackListProps> = React.memo(({ title, source }) => {
    const trackIndex = useAppSelector(getTrackIndex);
    const currentTrack = useAppSelector(getCurrentTrack);

    return (
        <List
            title={title}
            source={source}
            renderItem={(info, index) =>
                <Track
                    source={source}
                    index={index}
                    isPlaying={currentTrack && currentTrack.id === info.id && index === trackIndex}
                />}
        />
    );
});