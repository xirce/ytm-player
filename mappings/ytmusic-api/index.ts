import { YTMusic, YTNodes } from 'youtubei.js';
import { IAlbumInfo, IArtistInfoBase, IArtistInfo, IHomeItem, IHomeSection, IPlaylistInfo, ITrackBase } from '../../shared';

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

const getTrackCount = (source: MusicListItem): number | null => {
    const text = source instanceof YTNodes.MusicResponsiveListItem
        ? [source.item_count, source.subtitle?.toString(), ...source.flex_columns.map(column => column.title.toString())].join(' ')
        : [source.item_count, source.subtitle.toString()].join(' ');
    const value = text.match(/(\d[\d\s.,]*)\s*(?:songs?|tracks?|трек(?:а|ов)?|пес(?:ня|ни|ен)|композиц(?:ия|ии|ий))/i)?.[1];
    if (!value) return null;
    const count = Number.parseInt(value.replace(/\D/g, ''), 10);
    return Number.isFinite(count) ? count : null;
};

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
        trackCount: getTrackCount(source),
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
        trackCount: getTrackCount(source),
        radioId: `RDAMPL${id}`
    };
};

const mapToHomeItem = (source: YTNodes.MusicCarouselShelf['contents'][number]): IHomeItem | undefined => {
    if (source instanceof YTNodes.MusicResponsiveListItem) {
        switch (source.item_type) {
            case 'song':
            case 'video':
            case 'non_music_track':
                return source.id ? { type: 'track', data: mapToTrack(source) } : undefined;
            case 'album':
                return source.id ? { type: 'album', data: mapToAlbumInfo(source) } : undefined;
            case 'playlist':
                return source.id ? { type: 'playlist', data: mapToPlaylistInfo(source) } : undefined;
            case 'artist':
                return source.id ? { type: 'artist', data: mapToArtistInfoListItem(source) } : undefined;
            default:
                return undefined;
        }
    }

    if (source instanceof YTNodes.MusicTwoRowItem && source.id) {
        switch (source.item_type) {
            case 'album':
                return { type: 'album', data: mapToAlbumInfo(source) };
            case 'playlist':
                return { type: 'playlist', data: mapToPlaylistInfo(source) };
            case 'artist':
                return { type: 'artist', data: mapToArtistInfoListItem(source) };
            default:
                return undefined;
        }
    }

    return undefined;
};

export const mapToHomeSection = (source: YTNodes.MusicCarouselShelf): IHomeSection | undefined => {
    const items = source.contents
        .map(mapToHomeItem)
        .filter((item): item is IHomeItem => Boolean(item));

    if (!items.length) return undefined;
    return {
        title: source.header?.title.toString() ?? '',
        items
    };
};
