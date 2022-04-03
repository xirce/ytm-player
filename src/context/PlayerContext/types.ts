import { ITrack } from '../../types/ITrack';

export interface IPlayerState {
    isPlaying: boolean;
    trackIndex: number;
    tracks: ITrack[];
}

export interface IPlayerControl extends IPlayerState {
    setIsPlaying: (value: boolean) => void;
    setTracks: (tracks: ITrack[]) => void;
    setTrackIndex: (index: number) => void;
    skipNext: () => void;
    skipPrev: () => void;
}


export enum PlayerActionType {
    SetIsPlaying = 'SET_IS_PLAYING',
    SetTrackIndex = 'SET_TRACK_INDEX',
    SetTracks = 'SET_TRACKS'
}

export type PlayerAction = { type: PlayerActionType.SetIsPlaying, isPlaying: boolean }
    | { type: PlayerActionType.SetTrackIndex, trackIndex: number }
    | { type: PlayerActionType.SetTracks, tracks: ITrack[] }

