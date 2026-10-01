import { ArtistBasic, VideoDetailed } from "ytmusic-api";
import { IArtistInfoBase, ITrackBase } from "../shared";

export const parseNextTrack = (source: any): ITrackBase => ({
    id: source.videoId,
    title: source.title.runs[0].text,
    artist: parseArtistInfoBase(source.longBylineText.runs[0]),
    imageUrl: source.thumbnail.thumbnails[0].url,
    duration: parseDuration(source.lengthText.runs[0].text),
    radioId: 'RDAMVM' + source.videoId
});

function parseDuration(time: string) {
    if (!time) return null

    const [seconds, minutes, hours] = time
        .split(":")
        .reverse()
        .map(n => +n) as (number | undefined)[]

    return (seconds || 0) + (minutes || 0) * 60 + (hours || 0) * 60 * 60
}

export const parseArtistInfoBase = (source: ArtistBasic): IArtistInfoBase => ({
    id: source.artistId as string,
    name: source.name
});

export function parsePlaylistTrack(source: VideoDetailed): ITrackBase {
    return {
        id: source.videoId as string,
        title: source.name,
        artist: parseArtistInfoBase(source.artist),
        imageUrl: source.thumbnails[0].url as string,
        duration: source.duration,
        radioId: 'RDAMVM' + (source.videoId as string)
    };
}
