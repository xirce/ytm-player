export interface IArtistBase {
    id: string,
    name: string;
}

export interface IArtist extends IArtistBase {
    tracks: ITrackBase[],
}

export interface ITrackBase {
    id: string;
    title: string;
    artist: IArtistBase;
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
    artist: IArtistBase;
}

export interface IAlbum extends IAlbumBase {
    tracks: ITrackBase[];
}

export interface ISearchResponse {
    artists: IArtistBase[];
    tracks: ITrackBase[];
    albums: IAlbumBase[];
    playlists: IPlaylistBase[];
}
