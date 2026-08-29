import { YTMusic, YTNodes } from 'youtubei.js';
import { IAlbumInfo, IArtistInfoBase, IArtistInfo, IPlaylistInfo, ITrackBase } from '../../shared';

type MusicListItem = YTNodes.MusicResponsiveListItem | YTNodes.MusicTwoRowItem;

export const getThumbnailUrl = (
    thumbnails: ArrayLike<{ url: string; width?: number }> | undefined,
    preferredWidth = 500
): string => {
    const items = Array.from(thumbnails ?? []);
    if (!items.length) return '';

    return items.reduce((best, item) => {
        if (!Number.isFinite(item.width)) return best;
        if (!Number.isFinite(best.width)) return item;
        return Math.abs(item.width! - preferredWidth) < Math.abs(best.width! - preferredWidth)
            ? item
            : best;
    }, items[Math.floor((items.length - 1) / 2)]).url;
};

const lastThumbnail = (source: MusicListItem): string => {
    const thumbnails = source instanceof YTNodes.MusicResponsiveListItem
        ? source.thumbnails
        : source.thumbnail;
    return getThumbnailUrl(thumbnails);
};

const normalizePlaylistId = (id: string): string => id.replace(/^VL/, '');

export const mapToArtistInfoBase = (source?: {
    name?: string;
    channel_id?: string;
}): IArtistInfoBase => ({
    id: source?.channel_id ?? null,
    name: source?.name ?? ''
});

export const mapToArtistInfoListItem = (source: MusicListItem): IArtistInfo => ({
    id: source.id ?? null,
    name: source instanceof YTNodes.MusicResponsiveListItem
        ? source.name ?? source.title ?? ''
        : source.title.toString(),
    imageUrl: lastThumbnail(source)
});

export const mapToArtistInfo = (source: YTMusic.Artist, id: string): IArtistInfo => {
    const header = source.header;
    const thumbnail = header && 'thumbnail' in header
        ? (Array.isArray(header.thumbnail) ? header.thumbnail : header.thumbnail?.contents)
        : undefined;
    return {
        id,
        name: header && 'title' in header ? header.title?.toString() ?? '' : '',
        imageUrl: getThumbnailUrl(thumbnail, 1920)
    };
};

export const mapToTrack = (
    source: YTNodes.MusicResponsiveListItem,
    fallback: Partial<Pick<ITrackBase, 'artist' | 'album' | 'imageUrl'>> = {}
): ITrackBase => {
    const artist = source.artists?.at(0) ?? source.authors?.at(0) ?? source.author;
    return {
        id: source.id ?? '',
        title: source.title ?? source.name ?? '',
        artist: artist ? mapToArtistInfoBase(artist) : fallback.artist ?? { id: null, name: '' },
        album: source.album?.id
            ? { id: source.album.id, name: source.album.name }
            : fallback.album,
        imageUrl: getThumbnailUrl(source.thumbnails) || fallback.imageUrl || '',
        duration: source.duration?.seconds ?? null,
        radioId: `RDAMVM${source.id ?? ''}`
    };
};

export const mapToPlaylistInfo = (source: MusicListItem): IPlaylistInfo => {
    const id = source.id ?? '';
    return {
        id,
        name: source instanceof YTNodes.MusicResponsiveListItem
            ? source.title ?? source.name ?? ''
            : source.title.toString(),
        imageUrl: lastThumbnail(source),
        radioId: `RDAMPL${normalizePlaylistId(id)}`
    };
};

export const mapToAlbumInfo = (
    source: MusicListItem,
    fallbackArtist?: IArtistInfoBase
): IAlbumInfo => {
    const id = source.id ?? (source instanceof YTNodes.MusicResponsiveListItem ? source.album?.id : undefined) ?? '';
    const artist = source instanceof YTNodes.MusicResponsiveListItem
        ? source.author ?? source.artists?.at(0)
        : source.artists?.at(0);
    return {
        id,
        name: source instanceof YTNodes.MusicResponsiveListItem
            ? source.title ?? source.album?.name ?? ''
            : source.title.toString(),
        artist: artist ? mapToArtistInfoBase(artist) : fallbackArtist ?? { id: null, name: '' },
        imageUrl: lastThumbnail(source),
        year: source.year ? Number.parseInt(source.year, 10) || null : null,
        radioId: `RDAMPL${id}`
    };
};
