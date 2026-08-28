import { YTMusic, YTNodes } from 'youtubei.js';
import { IAlbumInfo, IArtistInfoBase, IArtistInfo, IPlaylistInfo, ITrackBase } from "../../shared";

export const mapToArtistInfoBase = (source: {
        name: string;
        channel_id?: string;
    }): IArtistInfoBase => ({
    id: source.channel_id!,
    name: source.name
});

export const mapToArtistInfoListItem = (source: YTNodes.MusicResponsiveListItem): IArtistInfo => ({
    id: source.artists!.at(0)!.channel_id!,
    name: source.artists!.at(0)!.name,
    imageUrl: source.thumbnails.at(-1)?.url as string
});

export const mapToArtistInfo = (source: YTMusic.Artist): IArtistInfo => ({
    id: null!,
    name: source.header!.as(YTNodes.MusicVisualHeader).title.text!,
    imageUrl: source.header!.as(YTNodes.MusicVisualHeader).thumbnail!.at(-1)?.url as string,
});

export const mapToTrack = (source: YTNodes.MusicResponsiveListItem): ITrackBase => ({
    id: source.id!,
    title: source.title!,
    artist: source.artists!.at(0)! && mapToArtistInfoBase(source.artists!.at(0)!),
    imageUrl: source.thumbnails[0].url,
    duration: source.duration!.seconds!,
    radioId: 'RDAMVM' + source.id
});

export const mapToPlaylistInfo = (source: YTNodes.MusicResponsiveListItem): IPlaylistInfo => ({
    id: source.id!,
    name: source.title!,
    imageUrl: source.thumbnails.at(-1)?.url as string,
    radioId: 'RDAMPL' + source.id!
});

export const mapToAlbumInfo = (source: YTNodes.MusicResponsiveListItem): IAlbumInfo => ({
    id: source.album!.id!,
    name: source.album!.name!,
    artist: source.artists!.at(0)! && mapToArtistInfoBase(source.artists?.at(0)!),
    imageUrl: source.thumbnails.at(-1)?.url as string,
    year: Number.parseInt(source.year!),
    radioId: 'RDAMPL' + source.album!.id!
});
