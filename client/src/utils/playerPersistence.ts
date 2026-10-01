import { ITrackBase } from '../../../shared';

const PLAYER_STATE_KEY = 'unison.player.state';
const PLAYER_PROGRESS_KEY = 'unison.player.progress';
const PLAYER_VOLUME_KEY = 'unison.player.volume';

export interface PersistedPlayerState {
    tracks: ITrackBase[];
    trackIndex: number;
    repeat: boolean;
    autoplay: boolean;
    autoplaySource: { id: string; title: string } | null;
}

export interface PersistedPlayerProgress {
    trackId: string;
    position: number;
    duration?: number;
}

export interface PersistedPlayerVolume {
    volume: number;
    muted: boolean;
}

const read = <T>(key: string): T | undefined => {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) as T : undefined;
    } catch {
        return undefined;
    }
};

const write = (key: string, value: unknown): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Playback must keep working when storage is unavailable or full.
    }
};

export const loadPlayerState = (): PersistedPlayerState | undefined => read(PLAYER_STATE_KEY);
export const savePlayerState = (state: PersistedPlayerState): void => write(PLAYER_STATE_KEY, state);
export const loadPlayerProgress = (): PersistedPlayerProgress | undefined => read(PLAYER_PROGRESS_KEY);
export const savePlayerProgress = (progress: PersistedPlayerProgress): void => write(PLAYER_PROGRESS_KEY, progress);
export const loadPlayerVolume = (): PersistedPlayerVolume | undefined => read(PLAYER_VOLUME_KEY);
export const savePlayerVolume = (volume: PersistedPlayerVolume): void => write(PLAYER_VOLUME_KEY, volume);
