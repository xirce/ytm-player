import { ITrack } from "../../../../shared";

export interface IPlayerState {
    isPlaying: boolean;
    trackIndex: number;
    tracks: ITrack[];
}

export interface IPlayerControl extends IPlayerState {
    setIsPlaying: (value: boolean) => void;
    setTracks: (tracks: ITrack[]) => void;
    appendTracks: (...tracks: ITrack[]) => void;
    appendLeftTracks: (...tracks: ITrack[]) => void;
    setTrackIndex: (index: number) => void;
    skipNext: () => void;
    skipPrev: () => void;
}


export enum PlayerActionType {
    SetIsPlaying = 'SET_IS_PLAYING',
    SetTracks = 'SET_TRACKS',
    AppendTracks = 'APPEND_TRACKS',
    AppendLeftTracks = 'APPEND_LEFT_Tracks',
    SetTrackIndex = 'SET_TRACK_INDEX',
}

export type PlayerAction = { type: PlayerActionType.SetIsPlaying, isPlaying: boolean }
    | { type: PlayerActionType.SetTracks, tracks: ITrack[] }
    | { type: PlayerActionType.AppendTracks, tracks: ITrack[] }
    | { type: PlayerActionType.AppendLeftTracks, tracks: ITrack[] }
    | { type: PlayerActionType.SetTrackIndex, trackIndex: number }

