import React, { useReducer } from 'react';
import { playerReducer } from './playerReducer';
import { IPlayerState, IPlayerControl, PlayerActionType } from './types';

const initialPlayerState: IPlayerState = {
    isPlaying: false,
    trackIndex: 0,
    tracks: [],
}

const initialPlayerControl: IPlayerControl = {
    isPlaying: false,
    trackIndex: 0,
    tracks: [],
    togglePlaying: () => { },
    setTrackIndex: () => { },
    skipNext: () => { },
    skipPrev: () => { },
}

const PlayerContext = React.createContext<IPlayerControl>(initialPlayerControl);

export const PlayerProvider: React.FC = ({ children }) => {
    const [state, dispatch] = useReducer(playerReducer, initialPlayerState);

    const togglePlaying = () => dispatch({ type: PlayerActionType.SetIsPlaying, isPlaying: !state.isPlaying });

    const setTrackIndex = (index: number) => dispatch({ type: PlayerActionType.SetTrackIndex, trackIndex: index });

    const skipNext = () => setTrackIndex(state.trackIndex === state.tracks.length - 1 ? 0 : state.trackIndex + 1);
    const skipPrev = () => setTrackIndex(state.trackIndex === 0 ? state.tracks.length - 1 : state.trackIndex - 1);

    return (
        <PlayerContext.Provider value={{
            ...initialPlayerState,
            togglePlaying,
            setTrackIndex,
            skipNext,
            skipPrev
        }}>
            {children}
        </PlayerContext.Provider>
    );
}