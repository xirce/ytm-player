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
    continuation?: string | null;
}

export interface ISabrFormat {
    itag: number;
    seedUrl?: string;
    last_modified_ms?: string;
    xtags?: string;
    width?: number;
    height?: number;
    mime_type?: string;
    audio_quality?: string;
    bitrate: number;
    average_bitrate?: number;
    quality?: string;
    quality_label?: string;
    audio_track?: { id: string };
    approx_duration_ms?: number;
    content_length?: number;
    is_drc?: boolean;
    language?: string | null;
    is_dubbed?: boolean;
    is_auto_dubbed?: boolean;
    is_descriptive?: boolean;
    is_secondary?: boolean;
    is_original?: boolean;
}

export interface ITrackPlaybackSource {
    manifest: string;
    sabr: {
        streamingUrl: string;
        ustreamerConfig: string;
        poToken: string;
        clientInfo: {
            clientName: number;
            clientVersion: string;
            osName: string;
            osVersion: string;
        };
        formats: ISabrFormat[];
    };
}

export interface IHomeSectionPage {
    items: IHomeItem[];
    continuation: string | null;
}

export interface IHomeFeed {
    sections: IHomeSection[];
    continuation: string | null;
}

export type AppAuthState =
    | { status: 'anonymous' }
    | {
        status: 'authenticated';
        user: { email: string; name: string; pictureUrl?: string };
        musicConnection: 'not_connected' | 'connected' | 'error';
        musicRecommendationsAvailable: boolean;
    };

export interface YouTubeMusicConnectionInput {
    cookie: string;
    authUser?: number;
    pageId?: string;
    language?: string;
}

export interface YouTubeMusicConnectionState {
    status: 'not_connected' | 'connected' | 'error';
}
