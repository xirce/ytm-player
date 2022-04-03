import {IPlayerState, PlayerAction, PlayerActionType} from "./types";


export const playerReducer = (state: IPlayerState, action: PlayerAction): IPlayerState => {
    switch (action.type) {
        case PlayerActionType.SetIsPlaying:
            return {
                ...state,
                isPlaying: action.isPlaying
            }
        case PlayerActionType.SetTrackIndex:
            return {
                ...state,
                trackIndex: action.trackIndex
            }
        case PlayerActionType.SetTracks:
            return {
                ...state,
                tracks: action.tracks
            }
        default:
            return state;
    }
}