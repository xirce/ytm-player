const assert = require('node:assert/strict');
const { test } = require('node:test');
const { YTNodes } = require('youtubei.js');
const { mapToHomeSection } = require('./index.ts');

const card = (navigationEndpoint, label = 'Песня') => ({
    musicTwoRowItemRenderer: {
        title: { runs: [{ text: 'Test title' }] },
        subtitle: { runs: [
            { text: label },
            { text: ' • ' },
            { text: 'Test artist', navigationEndpoint: { browseEndpoint: { browseId: 'UC_test' } } }
        ] },
        navigationEndpoint,
        thumbnailRenderer: { musicThumbnailRenderer: { thumbnail: {
            thumbnails: [{ url: 'https://example.com/cover.jpg', width: 512, height: 512 }]
        } } }
    }
});

const shelf = (contents) => new YTNodes.MusicCarouselShelf({
    header: { musicCarouselShelfBasicHeaderRenderer: { title: { runs: [{ text: 'Test section' }] } } },
    contents
});

test('home keeps songs, videos and browse cards in their original order', () => {
    const result = mapToHomeSection(shelf([
        card({ watchEndpoint: { videoId: 'song' } }, 'Song'),
        card({ browseEndpoint: { browseId: 'VL_playlist', browseEndpointContextSupportedConfigs: {
            browseEndpointContextMusicConfig: { pageType: 'MUSIC_PAGE_TYPE_PLAYLIST' }
        } } }),
        card({ watchEndpoint: { videoId: 'video' } }, 'Video')
    ]));
    assert.deepEqual(result?.items.map(item => [item.type, item.data.id]), [
        ['track', 'song'], ['playlist', 'VL_playlist'], ['track', 'video']
    ]);
});

test('home preserves track-only shelves and metadata for localized /next cards', () => {
    const result = mapToHomeSection(shelf([card({
        commandMetadata: { webCommandMetadata: { apiUrl: '/youtubei/v1/next' } },
        watchEndpoint: { videoId: 'localized-song' }
    })]));
    assert.equal(result?.title, 'Test section');
    const item = result?.items[0];
    assert.equal(item?.type, 'track');
    if (item?.type !== 'track') return;
    assert.equal(item.data.title, 'Test title');
    assert.deepEqual(item.data.artist, { id: 'UC_test', name: 'Test artist' });
    assert.equal(item.data.imageUrl, 'https://example.com/cover.jpg');
    assert.equal(item.data.radioId, 'RDAMVMlocalized-song');
    assert.equal(item.data.duration, null);
});

test('home does not turn unknown browse endpoints or missing video IDs into tracks', () => {
    assert.equal(mapToHomeSection(shelf([
        card({ browseEndpoint: { browseId: 'unsupported' } }),
        card({ watchEndpoint: {} })
    ])), undefined);
});
