import Parser from 'ytmusic-api/dist/parsers/Parser';
import { IArtistInfoBase, ITrackBase } from "../shared";

export const parseNextTrack = (source: any): ITrackBase => ({
    id: source.videoId,
    title: source.title.runs[0].text,
    artist: parseArtistInfoBase(source.longBylineText.runs[0]),
    imageUrl: source.thumbnail.thumbnails[0].url,
    duration: Parser.parseDuration(source.lengthText.runs[0].text),
    radioId: 'RDAMVM' + source.videoId
});

export const parseArtistInfoBase = (source: any): IArtistInfoBase => ({
    id: source.navigationEndpoint?.browseEndpoint.browseId as string,
    name: source.text
});

export function parsePlaylistTrack(source: any): ITrackBase {
    const flexColumns = source.flexColumns;

    return {
        id: source.playlistItemData?.videoId as string,
        title: flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text as string,
        artist: parseArtistInfoBase(flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs[0]),
        imageUrl: source.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails[0].url as string,
        duration: Parser.parseDuration(source.fixedColumns[0].musicResponsiveListItemFixedColumnRenderer.text.runs[0].text),
        radioId: 'RDAMVM' + (source.playlistItemData?.videoId as string)
    };
}
