import React from 'react';
import { Track } from "../Track/Track";
import { List } from "../List/List";
import { ITrackBase } from "../../../../shared";
import { useAppSelector } from "../../store";
import { getCurrentTrack, getIsPlaying, getTrackIndex } from "../../store/player";

export interface ITrackListProps {
    title?: string;
    source: ITrackBase[];
}

export const TrackList: React.FC<ITrackListProps> = React.memo(({ title, source }) => {
    const trackIndex = useAppSelector(getTrackIndex);
    const currentTrack = useAppSelector(getCurrentTrack);
    const isPlaying = useAppSelector(getIsPlaying);

    return (
        <List
            title={title}
            source={source}
            renderItem={(info, index) => {
                const isCurrent = currentTrack && currentTrack.id === info.id && index === trackIndex;

                return <Track
                    source={source}
                    index={index}
                    isCurrent={isCurrent}
                    isPlaying={isCurrent && isPlaying}
                />
            }
            }
        />
    );
});