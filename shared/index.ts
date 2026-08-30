export interface IHaveRadio {
    radioId: string;
}

export interface IImageUrls {
    small: string;
    medium: string;
    large: string;
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
    imageUrls?: IImageUrls;
    duration: number | null;
    playCount?: number | null;
}

export interface IPlaylistInfo extends IHaveRadio {
    id: string;
    name: string;
    imageUrl: string;
    trackCount: number | null;
    browseParams?: string;
}

export interface IPlaylist {
    info: IPlaylistInfo;
    tracks: ITrackBase[];
    continuation: string | null;
}

export interface IPlaylistPage {
    tracks: ITrackBase[];
    continuation: string | null;
}

export interface IAlbumInfo extends IHaveRadio {
    id: string;
    name: string;
    year: number | null;
    imageUrl: string;
    artist: IArtistInfoBase;
    trackCount: number | null;
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

export type IHomeItem =
    | { type: 'track'; data: ITrackBase }
    | { type: 'album'; data: IAlbumInfo }
    | { type: 'playlist'; data: IPlaylistInfo }
    | { type: 'artist'; data: IArtistInfo };

export interface IHomeSection {
    title: string;
    items: IHomeItem[];
}

export interface IHomeFeed {
    sections: IHomeSection[];
}

export type YouTubeAuthState =
    | { status: 'anonymous' | 'starting' | 'restoring' }
    | {
        status: 'authenticated';
        method: 'oauth' | 'cookie' | 'oauth+cookie';
        musicRecommendationsAvailable: boolean;
    }
    | {
        status: 'pending';
        verificationUrl: string;
        userCode: string;
        expiresAt: number;
    }
    | { status: 'error'; error: string };
