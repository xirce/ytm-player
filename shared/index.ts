export interface ITrackBase {
    id: string;
    title: string;
    artist: string;
    imageUrl: string;
    duration: number;
}

export interface IPlaylist {
    id: string;
    name: string;
    imageUrl: string;
    tracksCount: number;
}

export interface IAlbum {
    id: string;
    name: string;
    year: number;
    imageUrl: string;
    artist: string;
}