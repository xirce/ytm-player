export interface IPlayerState {
    isPlaying: boolean;
    trackIndex: number;
    tracks: object[];
}

export interface IPlayerControl extends IPlayerState {
    togglePlaying: () => void;
    setTrackIndex: (index: number) => void;
    skipNext: () => void;
    skipPrev: () => void;
}


export enum PlayerActionType {
    SetIsPlaying = 'TOGGLE_PLAYING',
    SetTrackIndex = 'SET_TRACK_INDEX',
    SetTracks = 'SET_TRACKS'
}

export type PlayerAction = { type: PlayerActionType.SetIsPlaying, isPlaying: boolean }
    | { type: PlayerActionType.SetTrackIndex, trackIndex: number }
    | { type: PlayerActionType.SetTracks, tracks: object[] }

