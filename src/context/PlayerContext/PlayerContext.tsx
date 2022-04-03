import React from 'react';
import {playerReducer} from './playerReducer';
import {IPlayerState, IPlayerControl, PlayerActionType} from './types';
import {ITrack} from '../../types/ITrack';
import {useEnhancedReducer} from "../../hooks/useEnhancedReducer";

const initialPlayerState: IPlayerState = {
    isPlaying: false,
    trackIndex: 0,
    tracks: [],
}

const initialPlayerControl: IPlayerControl = {
    isPlaying: false,
    trackIndex: 0,
    tracks: [],
    setIsPlaying: (value: boolean) => {
    },
    setTracks: (tracks: ITrack[]) => {
    },
    setTrackIndex: (index: number) => {
    },
    skipNext: () => {
    },
    skipPrev: () => {
    },
}

export const PlayerContext = React.createContext<IPlayerControl>(initialPlayerControl);

export const PlayerProvider: React.FC = ({children}) => {
    const [_, dispatch, getState] = useEnhancedReducer(playerReducer, initialPlayerState);

    const setIsPlaying = (value: boolean) => dispatch({type: PlayerActionType.SetIsPlaying, isPlaying: value});

    const setTrackIndex = (index: number) => dispatch({type: PlayerActionType.SetTrackIndex, trackIndex: index});

    const setTracks = (tracks: ITrack[]) => dispatch({type: PlayerActionType.SetTracks, tracks: tracks});

    const skipNext = () => {
        const lastState = getState();
        setTrackIndex(lastState.trackIndex === lastState.tracks.length - 1 ? 0 : lastState.trackIndex + 1);
        if (!lastState.isPlaying) {
            setIsPlaying(true);
        }
    }

    const skipPrev = () => {
        const lastState = getState();
        setTrackIndex(lastState.trackIndex === 0 ? lastState.tracks.length - 1 : lastState.trackIndex - 1);
        if (!lastState.isPlaying) {
            setIsPlaying(true);
        }
    }

    return (
        <PlayerContext.Provider value={{
            ...getState(),
            setIsPlaying,
            setTracks,
            setTrackIndex,
            skipNext,
            skipPrev
        }}>
            {children}
        </PlayerContext.Provider>
    );
}