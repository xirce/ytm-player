import {IPlayerState, PlayerAction, PlayerActionType} from ".";


export const playerReducer = (state: IPlayerState, action: PlayerAction): IPlayerState => {
    switch (action.type) {
        case PlayerActionType.SetIsPlaying:
            return {
                ...state,
                isPlaying: action.isPlaying
            }
        case PlayerActionType.SetTracks:
            return {
                ...state,
                tracks: action.tracks
            }
        case PlayerActionType.AppendTracks:
            return {
                ...state,
                tracks: [...state.tracks, ...action.tracks]
            }
        case PlayerActionType.AppendLeftTracks:
            return {
                ...state,
                tracks: [...state.tracks.slice(0, state.trackIndex), ...action.tracks, ...state.tracks.slice(state.trackIndex)]
            }
        case PlayerActionType.SetTrackIndex:
            return {
                ...state,
                trackIndex: action.trackIndex
            }
        default:
            return state;
    }
}