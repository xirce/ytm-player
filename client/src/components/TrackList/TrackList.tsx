import React from 'react';
import { Track } from "../Track/Track";
import { List } from "../List/List";
import { ITrackBase } from "../../../../shared";
import { useAppSelector } from "../../store";
import { getDisplayedTrack, getIsPlaying } from "../../store/player";

export interface ITrackListProps {
    title?: string;
    source: ITrackBase[];
    showPlayCount?: boolean;
}

export const TrackList: React.FC<ITrackListProps> = React.memo(({ title, source, showPlayCount = false }) => {
    const currentTrack = useAppSelector(getDisplayedTrack);
    const isPlaying = useAppSelector(getIsPlaying);

    return (
        <List
            title={title}
            source={source}
            renderItem={(info, index) => {
                const isCurrent = currentTrack?.id === info.id;

                return <Track
                    source={source}
                    index={index}
                    isCurrent={isCurrent}
                    isPlaying={isCurrent && isPlaying}
                    showPlayCount={showPlayCount}
                />
            }
            }
        />
    );
});
