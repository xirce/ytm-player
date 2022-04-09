export interface ITrackBase {
    id: string;
    title: string;
    artist: string;
    imageUrl: string;
    duration: number;
}

export interface ITrack extends ITrackBase {
    url: string;
}

export interface IAllInfo {
    type: string;
    name: string;
    artists: string;
}