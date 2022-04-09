import React, { useContext } from 'react';
import { playerReducer } from './playerReducer';
import { IPlayerState, IPlayerControl, PlayerActionType } from '.';
import { usuReferredReducer } from "../../hooks/usuReferredReducer";
import { ITrack } from '../../../../shared';

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
    appendTracks: (...tracks: ITrack[]) => {
    },
    appendLeftTracks: (...tracks: ITrack[]) => {
    },
    setTrackIndex: (index: number) => {
    },
    skipNext: () => {
    },
    skipPrev: () => {
    },
}

export const PlayerContext = React.createContext<IPlayerControl>(initialPlayerControl);

export const usePlayerContext = () => useContext(PlayerContext);

export const PlayerProvider: React.FC = ({ children }) => {
    const [stateRef, dispatch] = usuReferredReducer(playerReducer, initialPlayerState);

    const setIsPlaying = (value: boolean) => dispatch({ type: PlayerActionType.SetIsPlaying, isPlaying: value });

    const setTracks = (tracks: ITrack[]) => dispatch({ type: PlayerActionType.SetTracks, tracks: tracks });

    const appendTracks = (...tracks: ITrack[]) => dispatch({ type: PlayerActionType.AppendTracks, tracks: tracks });

    const appendLeftTracks = (...tracks: ITrack[]) => dispatch({ type: PlayerActionType.AppendLeftTracks, tracks: tracks });

    const setTrackIndex = (index: number) => dispatch({ type: PlayerActionType.SetTrackIndex, trackIndex: index });

    const skipNext = () => {
        const lastState = stateRef.current;
        setTrackIndex(lastState.trackIndex === lastState.tracks.length - 1 ? 0 : lastState.trackIndex + 1);
        if (!lastState.isPlaying) {
            setIsPlaying(true);
        }
    }

    const skipPrev = () => {
        const lastState = stateRef.current;
        setTrackIndex(lastState.trackIndex === 0 ? lastState.tracks.length - 1 : lastState.trackIndex - 1);
        if (!lastState.isPlaying) {
            setIsPlaying(true);
        }
    }

    return (
        <PlayerContext.Provider value={{
            ...stateRef.current,
            setIsPlaying,
            setTracks,
            appendTracks,
            appendLeftTracks,
            setTrackIndex,
            skipNext,
            skipPrev
        }}>
            {children}
        </PlayerContext.Provider>
    );
}