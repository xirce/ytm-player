import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ITrackProps } from "../components/Track/Track";
import { RootState } from "./index";
import { shuffle } from "../utils/array-extensions";
import { ITrackBase } from "../../../shared";

export interface IPlayerState {
    isPlaying: boolean;
    trackIndex: number;
    tracks: ITrackBase[];
    repeat: boolean;
}

const initialPlayerState: IPlayerState = {
    isPlaying: false,
    trackIndex: 0,
    tracks: [],
    repeat: false
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
        removeTrack(state, action: PayloadAction<number>) {
            state.tracks.splice(action.payload, 1);
            if (action.payload >= state.trackIndex) {
                state.trackIndex = Math.max(0, state.trackIndex);
            }
        },
        setTrackIndex(state, action: PayloadAction<number>) {
            state.trackIndex = action.payload;
        },
        skipNext(state) {
            state.trackIndex = state.trackIndex === state.tracks.length - 1 ? 0 : state.trackIndex + 1;
            state.isPlaying = true;
        },
        skipPrev(state) {
            state.trackIndex = (state.trackIndex === 0 ? state.tracks.length - 1 : state.trackIndex - 1);
            state.isPlaying = true;
        },
        setRepeat(state, action: PayloadAction<boolean>) {
            state.repeat = action.payload;
        },
        shuffle(state) {
            if (!state.tracks?.length) return;

            const currentTrack = state.tracks.splice(state.trackIndex, 1)[0];
            state.tracks = [currentTrack, ...shuffle(state.tracks)];
            state.trackIndex = 0;
        }
    }
});

export const getIsPlaying = (state: RootState) => state.player.isPlaying;
export const getTrackIndex = (state: RootState) => state.player.trackIndex;
export const getCurrentTrack = (state: RootState) => state.player.tracks[state.player.trackIndex];
export const getTracks = (state: RootState) => state.player.tracks;
export const getTrackListItems = (state: RootState): ITrackProps[] =>
    state.player.tracks.map((track, index) => {
        const currentTrack = state.player.tracks[state.player.trackIndex];
        const isCurrent = currentTrack && currentTrack.id === track.id && index === state.player.trackIndex;

        return {
            source: state.player.tracks,
            index: index,
            isCurrent: isCurrent,
            isPlaying: isCurrent && state.player.isPlaying
        }
    });
export const getRepeat = (state: RootState) => state.player.repeat;
