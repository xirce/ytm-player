export interface IHaveRadio {
    radioId: string;
}

export interface IArtistInfoBase {
    id: string | null,
    name: string;
}

export interface IArtistInfo extends IArtistInfoBase {
    imageUrl: string;
}

export interface IArtist {
    info: IArtistInfo
    topSongs: ITrackBase[];
    /** @deprecated Use topSongs. */
    tracks: ITrackBase[],
    albums: IAlbumInfo[],
    singles: IAlbumInfo[],
}

export interface ITrackBase extends IHaveRadio {
    id: string;
    title: string;
    artist: IArtistInfoBase;
    album?: Pick<IAlbumInfo, 'id' | 'name'>;
    imageUrl: string;
    duration: number | null;
}

export interface IPlaylistInfo extends IHaveRadio {
    id: string;
    name: string;
    imageUrl: string;
}

export interface IPlaylist {
    info: IPlaylistInfo;
    tracks: ITrackBase[];
}

export interface IAlbumInfo extends IHaveRadio {
    id: string;
    name: string;
    year: number | null;
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
