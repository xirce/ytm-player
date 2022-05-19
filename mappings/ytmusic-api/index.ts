import { IAlbumBase, IArtistBase, IPlaylistBase, ITrackBase } from "../../shared";
import { AlbumDetailed, ArtistBasic, PlaylistFull, SongDetailed, VideoDetailed } from "ytmusic-api";

export const mapToArtistBase = (source: ArtistBasic): IArtistBase => ({
    id: source.artistId,
    name: source.name
})

export const mapToTrack = (source: SongDetailed | Omit<VideoDetailed, 'views'>): ITrackBase => ({
    id: source.videoId,
    title: source.name,
    artist: mapToArtistBase(source.artists[0]),
    imageUrl: source.thumbnails[0].url,
    duration: source.duration
})

export const mapToPlaylistBase = (source: PlaylistFull): IPlaylistBase => ({
    id: source.playlistId,
    name: source.name,
    imageUrl: source.thumbnails[0].url,
    tracksCount: source.videoCount
})

export const mapToAlbumBase = (source: AlbumDetailed): IAlbumBase => ({
    id: source.playlistId,
    name: source.name,
    artist: mapToArtistBase(source.artists[0]),
    imageUrl: source.thumbnails[0].url,
    year: source.year
});
