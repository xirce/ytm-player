import { YTMusic, YTNodes } from 'youtubei.js';
import { IAlbumInfo, IArtistInfoBase, IArtistInfo, IHomeItem, IHomeSection, IImageUrls, IPlaylistInfo, ITrackBase } from '../../shared';

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

const withThumbnailSize = (url: string, size: number): string => {
    if (!url || !/(?:googleusercontent\.com|ggpht\.com)/i.test(url)) return url;
    if (/=w\d+(?:-h\d+)?/.test(url)) {
        return url.replace(/=w\d+(?:-h\d+)?/, `=w${size}-h${size}`);
    }
    return url;
};

export const getThumbnailUrls = (
    thumbnails: ArrayLike<{ url: string; width?: number }> | undefined
): IImageUrls => ({
    small: withThumbnailSize(getThumbnailUrl(thumbnails, 120), 120),
    medium: withThumbnailSize(getThumbnailUrl(thumbnails, 512), 512),
    large: withThumbnailSize(getThumbnailUrl(thumbnails, 1200), 1200)
});

const lastThumbnail = (source: MusicListItem): string => {
    const thumbnails = source instanceof YTNodes.MusicResponsiveListItem
        ? source.thumbnails
        : source.thumbnail;
    return getThumbnailUrl(thumbnails);
};

const normalizePlaylistId = (id: string): string => id.replace(/^VL/, '');

const parseCompactCount = (value: string): number | null => {
    const match = value.replace(/\u00a0/g, ' ').match(
        /(\d[\d\s]*(?:[.,]\d+)?)\s*(тыс(?:\.|яч[аи]?)?|млн|миллион(?:а|ов)?|млрд|миллиард(?:а|ов)?|[kmb])?\s*(?:прослушиван(?:ие|ия|ий)|прослушиваний|plays?|views?)/i
    );
    if (!match) return null;

    const numericValue = Number.parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(numericValue)) return null;
    const suffix = (match[2] ?? '').toLowerCase();
    const multiplier = /^(?:тыс|k)/.test(suffix)
        ? 1_000
        : /^(?:млн|миллион|m$)/.test(suffix)
            ? 1_000_000
            : /^(?:млрд|миллиард|b$)/.test(suffix)
                ? 1_000_000_000
                : 1;
    return Math.round(numericValue * multiplier);
};

const getPlayCount = (source: YTNodes.MusicResponsiveListItem): number | null => {
    const text = [
        source.views,
        ...source.flex_columns.map(column => column.title.toString()),
        ...source.fixed_columns.map(column => column.title.toString())
    ].filter(Boolean).join(' ');
    return parseCompactCount(text);
};

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
    fallback: Partial<Pick<ITrackBase, 'artist' | 'album' | 'imageUrl' | 'imageUrls'>> = {}
): ITrackBase => {
    const artist = source.artists?.at(0) ?? source.authors?.at(0) ?? source.author;
    const mappedArtist = artist ? mapToArtistInfoBase(artist) : undefined;
    const sourceImageUrls = getThumbnailUrls(source.thumbnails);
    const imageUrls = sourceImageUrls.medium
        ? sourceImageUrls
        : fallback.imageUrls ?? getThumbnailUrls(fallback.imageUrl ? [{ url: fallback.imageUrl }] : []);
    return {
        id: source.id ?? '',
        title: source.title ?? source.name ?? '',
        artist: mappedArtist?.name?.trim()
            ? mappedArtist
            : fallback.artist?.name?.trim()
                ? fallback.artist
                : mappedArtist ?? fallback.artist ?? { id: null, name: '' },
        album: source.album?.id
            ? { id: source.album.id, name: source.album.name }
            : fallback.album,
        imageUrl: imageUrls.medium || fallback.imageUrl || '',
        imageUrls,
        duration: source.duration?.seconds ?? null,
        playCount: getPlayCount(source),
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
        browseParams: source.endpoint?.payload?.params,
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

export const mapPlaylistPanelVideoToTrack = (source: YTNodes.PlaylistPanelVideo): ITrackBase => {
    const imageUrls = getThumbnailUrls(source.thumbnail);
    return {
        id: source.video_id,
        title: source.title.toString(),
        artist: {
            id: source.artists?.[0]?.channel_id ?? null,
            name: source.artists?.[0]?.name ?? source.author ?? ''
        },
        album: source.album?.id ? { id: source.album.id, name: source.album.name } : undefined,
        imageUrl: imageUrls.medium,
        imageUrls,
        duration: source.duration?.seconds ?? null,
        playCount: null,
        radioId: `RDAMVM${source.video_id}`
    };
};

export const mapToHomeItem = (source: unknown): IHomeItem | undefined => {
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
        // Localized songs and /next endpoints are not always classified as songs by youtubei.js.
        const videoId = source.endpoint.payload.videoId;
        if (typeof videoId === 'string' && videoId) {
            const artistRun = source.subtitle.runs?.find(run =>
                'endpoint' in run && run.endpoint?.payload.browseId?.startsWith('UC'));
            const artist = source.artists?.[0] ?? source.author ?? (artistRun && 'endpoint' in artistRun ? {
                name: artistRun.text,
                channel_id: artistRun.endpoint?.payload.browseId
            } : undefined);
            const imageUrls = getThumbnailUrls(source.thumbnail);
            return {
                type: 'track',
                data: {
                    id: videoId,
                    title: source.title.toString(),
                    artist: mapToArtistInfoBase(artist),
                    imageUrl: imageUrls.medium,
                    imageUrls,
                    duration: null,
                    playCount: parseCompactCount(source.subtitle.toString()),
                    radioId: `RDAMVM${videoId}`
                }
            };
        }
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
