import { IAlbumBase, IArtistInfoBase, IArtistInfo, IPlaylistBase, ITrackBase } from "../../shared";
import { AlbumDetailed, ArtistDetailed, PlaylistFull, ArtistBasic } from "ytmusic-api";

export const mapToArtistInfoBase = (source: ArtistBasic): IArtistInfoBase => ({
    id: source.artistId,
    name: source.name
});

export const mapToArtistInfo = (source: ArtistDetailed): IArtistInfo => ({
    id: source.artistId,
    name: source.name,
    imageUrl: (source.thumbnails[3] || source.thumbnails[2] || source.thumbnails[0]).url
});

export const mapToTrack = (source: any): ITrackBase => ({
    id: source.videoId,
    title: source.name,
    artist: source.artists[0] && mapToArtistInfoBase(source.artists[0]),
    imageUrl: source.thumbnails[0].url,
    duration: source.duration
});

export const mapToPlaylistBase = (source: PlaylistFull): IPlaylistBase => ({
    id: source.playlistId,
    name: source.name,
    imageUrl: source.thumbnails[0].url,
    tracksCount: source.videoCount
});

export const mapToAlbumBase = (source: AlbumDetailed): IAlbumBase => ({
    id: source.albumId,
    name: source.name,
    artist: source.artists[0] && mapToArtistInfoBase(source.artists[0]),
    imageUrl: (source.thumbnails[2] || source.thumbnails[1] || source.thumbnails[0]).url,
    year: source.year
});
