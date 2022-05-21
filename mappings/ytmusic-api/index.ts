import { IAlbumBase, IArtistBase, IArtistDetailed, IPlaylistBase, ITrackBase } from "../../shared";
import { AlbumDetailed, ArtistDetailed, PlaylistFull, SongDetailed, VideoDetailed, ArtistBasic } from "ytmusic-api";

export const mapToArtistBase = (source: ArtistBasic): IArtistBase => ({
    id: source.artistId,
    name: source.name
})

export const mapToArtistDetailed = (source: ArtistDetailed): IArtistDetailed => ({
    id: source.artistId,
    name: source.name,
    imageUrl: source.thumbnails[0].url
})

export const mapToTrack = (source: SongDetailed | Omit<VideoDetailed, 'views'> | any): ITrackBase => ({
    id: source.videoId,
    title: source.name,
    artist: source.artists[0] && mapToArtistBase(source.artists[0]),
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
    id: source.albumId,
    name: source.name,
    artist: source.artists[0] && mapToArtistBase(source.artists[0]),
    imageUrl: source.thumbnails[0].url,
    year: source.year
});
