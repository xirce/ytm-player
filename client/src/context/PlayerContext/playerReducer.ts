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
            state.tracks.splice(state.trackIndex, 0, ...action.tracks);
            return {
                ...state
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