export interface IHaveRadio {
    radioId: string;
}

export interface IArtistInfoBase {
    id: string,
    name: string;
}

export interface IArtistInfo extends IArtistInfoBase {
    imageUrl: string;
}

export interface IArtist {
    info: IArtistInfo
    tracks: ITrackBase[],
    albums: IAlbumInfo[],
}

export interface ITrackBase extends IHaveRadio {
    id: string;
    title: string;
    artist: IArtistInfoBase;
    imageUrl: string;
    duration: number;
}

export interface IPlaylistInfo extends IHaveRadio {
    id: string;
    name: string;
    imageUrl: string;
    tracksCount: number;
}

export interface IPlaylist {
    info: IPlaylistInfo;
    tracks: ITrackBase[];
}

export interface IAlbumInfo extends IHaveRadio {
    id: string;
    name: string;
    year: number;
    imageUrl: string;
    artist: IArtistInfoBase;
}

export interface IAlbum {
    info: IAlbumInfo;
    tracks: ITrackBase[];
}

export interface ISearchResponse {
    artists: IArtistInfo[];
    tracks: ITrackBase[];
    albums: IAlbumInfo[];
    playlists: IPlaylistInfo[];
}
