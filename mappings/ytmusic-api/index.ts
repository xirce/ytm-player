import { IAlbumInfo, IArtistInfoBase, IArtistInfo, IPlaylistInfo, ITrackBase } from "../../shared";
import { AlbumDetailed, ArtistDetailed, ArtistBasic, PlaylistDetailed } from "ytmusic-api";

export const mapToArtistInfoBase = (source: ArtistBasic): IArtistInfoBase => ({
    id: source.artistId,
    name: source.name
});

export const mapToArtistInfo = (source: ArtistDetailed): IArtistInfo => ({
    id: source.artistId,
    name: source.name,
    imageUrl: source.thumbnails.at(-1)?.url as string
});

export const mapToTrack = (source: any): ITrackBase => ({
    id: source.videoId,
    title: source.name,
    artist: source.artists[0] && mapToArtistInfoBase(source.artists[0]),
    imageUrl: source.thumbnails[0].url,
    duration: source.duration,
    radioId: 'RDAMVM' + source.videoId
});

export const mapToPlaylistInfo = (source: PlaylistDetailed): IPlaylistInfo => ({
    id: source.playlistId,
    name: source.name,
    imageUrl: source.thumbnails.at(-1)?.url as string,
    radioId: 'RDAMPL' + source.playlistId
});

export const mapToAlbumInfo = (source: AlbumDetailed): IAlbumInfo => ({
    id: source.albumId,
    name: source.name,
    artist: source.artist && mapToArtistInfoBase(source.artist),
    imageUrl: source.thumbnails.at(-1)?.url as string,
    year: source.year,
    radioId: 'RDAMPL' + source.playlistId
});
