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
    albums: IAlbumBase[],
}

export interface ITrackBase {
    id: string;
    title: string;
    artist: IArtistInfoBase;
    imageUrl: string;
    duration: number;
}

export interface IPlaylistBase {
    id: string;
    name: string;
    imageUrl: string;
    tracksCount: number;
}

export interface IPlaylist extends IPlaylistBase {
    tracks: ITrackBase[];
}

export interface IAlbumBase {
    id: string;
    name: string;
    year: number;
    imageUrl: string;
    artist: IArtistInfoBase;
}

export interface IAlbum extends IAlbumBase {
    tracks: ITrackBase[];
}

export interface ISearchResponse {
    artists: IArtistInfo[];
    tracks: ITrackBase[];
    albums: IAlbumBase[];
    playlists: IPlaylistBase[];
}
