import { ITrackBase } from "../../../shared";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./index";

export interface IPlayerState {
    isPlaying: boolean;
    trackIndex: number;
    tracks: ITrackBase[];
}

const initialPlayerState: IPlayerState = {
    isPlaying: false,
    trackIndex: 0,
    tracks: [],
}

export const playerSlice = createSlice({
    name: 'player',
    initialState: initialPlayerState,
    reducers: {
        setIsPlaying(state: IPlayerState, action: PayloadAction<boolean>) {
            state.isPlaying = action.payload;
        },
        setTracks(state, action: PayloadAction<ITrackBase[]>) {
            state.tracks = action.payload;
        },
        appendTracks(state, action: PayloadAction<ITrackBase[]>) {
            state.tracks.push(...action.payload);
        },
        appendLeftTracks(state, action: PayloadAction<ITrackBase[]>) {
            state.tracks.splice(state.trackIndex, 0, ...action.payload);
        },
        skipNext(state) {
            state.trackIndex = state.trackIndex === state.tracks.length - 1 ? 0 : state.trackIndex + 1;
            if (!state.isPlaying) {
                state.isPlaying = true;
            }
        },
        skipPrev(state) {
            state.trackIndex = (state.trackIndex === 0 ? state.tracks.length - 1 : state.trackIndex - 1);
            if (!state.isPlaying) {
                state.isPlaying = true;
            }
        }
    }
});

export const getIsPlaying = (state: RootState) => state.player.isPlaying;
export const getCurrentTrack = (state: RootState) => state.player.tracks[state.player.trackIndex];
export const getTracks = (state: RootState) => state.player.tracks;
