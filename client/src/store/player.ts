import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ITrackProps } from "../components/Track/Track";
import { RootState } from "./index";
import { shuffle } from "../utils/array-extensions";
import { ITrackBase } from "../../../shared";
import { loadPlayerProgress, loadPlayerState } from "../utils/playerPersistence";

export interface IPlayerState {
    isExpanded: boolean;
    isPlaying: boolean;
    trackIndex: number;
    displayTrackIndex: number | null;
    tracks: ITrackBase[];
    repeat: boolean;
    autoplay: boolean;
    autoplaySource: { id: string; title: string } | null;
}

const persistedPlayerState = loadPlayerState();
const persistedTracks = persistedPlayerState?.tracks;
const restoredTracks = Array.isArray(persistedTracks) ? persistedTracks : [];
const restoredProgress = loadPlayerProgress();
if (restoredProgress?.duration && restoredProgress.duration > 0) {
    restoredTracks.forEach(track => {
        if (track.id === restoredProgress.trackId) track.duration = restoredProgress.duration!;
    });
}
const restoredTrackIndex = Math.min(
    Math.max(0, persistedPlayerState?.trackIndex ?? 0),
    Math.max(0, restoredTracks.length - 1)
);

const initialPlayerState: IPlayerState = {
    isExpanded: false,
    isPlaying: false,
    trackIndex: restoredTrackIndex,
    displayTrackIndex: null,
    tracks: restoredTracks,
    repeat: persistedPlayerState?.repeat ?? false,
    autoplay: persistedPlayerState?.autoplay ?? true,
    autoplaySource: persistedPlayerState?.autoplaySource ?? null
}

export const playerSlice = createSlice({
    name: 'player',
    initialState: initialPlayerState,
    reducers: {
        setPlayerExpanded(state, action: PayloadAction<boolean>) {
            state.isExpanded = action.payload;
        },
        setIsPlaying(state: IPlayerState, action: PayloadAction<boolean>) {
            state.isPlaying = action.payload;
        },
        setTracks(state, action: PayloadAction<ITrackBase[]>) {
            state.tracks = action.payload;
            state.displayTrackIndex = null;
            state.autoplaySource = null;
        },
        appendTracks(state, action: PayloadAction<ITrackBase[]>) {
            state.tracks.push(...action.payload);
        },
        appendLeftTracks(state, action: PayloadAction<ITrackBase[]>) {
            state.tracks.splice(state.trackIndex + 1, 0, ...action.payload);
        },
        removeTrack(state, action: PayloadAction<number>) {
            state.tracks.splice(action.payload, 1);
            if (action.payload >= state.trackIndex) {
                state.trackIndex = Math.max(0, state.trackIndex);
            }
        },
        setTrackIndex(state, action: PayloadAction<number>) {
            state.trackIndex = action.payload;
            state.displayTrackIndex = null;
        },
        setDisplayTrackIndex(state, action: PayloadAction<number | null>) {
            state.displayTrackIndex = action.payload;
        },
        updateTrackDuration(state, action: PayloadAction<{ id: string; duration: number }>) {
            if (!Number.isFinite(action.payload.duration) || action.payload.duration <= 0) return;
            state.tracks.forEach(track => {
                if (track.id === action.payload.id) track.duration = action.payload.duration;
            });
        },
        updateTrackMetadata(state, action: PayloadAction<ITrackBase>) {
            state.tracks.forEach((track, index) => {
                if (track.id === action.payload.id) {
                    state.tracks[index] = { ...track, ...action.payload };
                }
            });
        },
        skipNext(state) {
            state.trackIndex = state.trackIndex === state.tracks.length - 1 ? 0 : state.trackIndex + 1;
            state.displayTrackIndex = null;
            state.isPlaying = true;
        },
        skipPrev(state) {
            state.trackIndex = (state.trackIndex === 0 ? state.tracks.length - 1 : state.trackIndex - 1);
            state.displayTrackIndex = null;
            state.isPlaying = true;
        },
        setRepeat(state, action: PayloadAction<boolean>) {
            state.repeat = action.payload;
        },
        setAutoplay(state, action: PayloadAction<boolean>) {
            state.autoplay = action.payload;
            if (!action.payload) state.autoplaySource = null;
        },
        setAutoplaySource(state, action: PayloadAction<{ id: string; title: string } | null>) {
            state.autoplaySource = action.payload;
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
export const getDisplayTrackIndex = (state: RootState) => state.player.displayTrackIndex ?? state.player.trackIndex;
export const getCurrentTrack = (state: RootState) => state.player.tracks[state.player.trackIndex];
export const getDisplayedTrack = (state: RootState) => state.player.tracks[getDisplayTrackIndex(state)];
export const getTracks = (state: RootState) => state.player.tracks;
export const getTrackListItems = (state: RootState): ITrackProps[] =>
    state.player.tracks.map((track, index) => {
        const displayTrackIndex = getDisplayTrackIndex(state);
        const currentTrack = state.player.tracks[displayTrackIndex];
        const isCurrent = currentTrack && currentTrack.id === track.id && index === displayTrackIndex;

        return {
            source: state.player.tracks,
            index: index,
            isCurrent: isCurrent,
            isPlaying: isCurrent && state.player.isPlaying
        }
    });
export const getRepeat = (state: RootState) => state.player.repeat;
export const getAutoplay = (state: RootState) => state.player.autoplay;
export const getAutoplaySource = (state: RootState) => state.player.autoplaySource;
