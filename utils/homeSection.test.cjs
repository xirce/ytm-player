const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Parser } = require('youtubei.js');
const ytmusic = require('./YTMusicApiWrapper.ts').default;

const card = id => ({ musicTwoRowItemRenderer: {
    title: { runs: [{ text: id }] }, subtitle: { runs: [{ text: 'Song' }] },
    navigationEndpoint: { watchEndpoint: { videoId: id } },
    thumbnailRenderer: { musicThumbnailRenderer: { thumbnail: { thumbnails: [] } } }
} });

test('section browse and grid continuation preserve order and stop at the last page', async () => {
    const original = ytmusic.musicAuthenticationInnertube;
    const requests = [];
    const responses = [
        { contents: { gridRenderer: { items: [card('first'), card('second')], continuations: [{ nextContinuationData: { continuation: 'next' } }] } } },
        { continuationContents: { gridContinuation: { items: [card('third')] } } }
    ];
    ytmusic.musicAuthenticationInnertube = { actions: { execute: async (path, request) => {
        assert.equal(path, '/browse');
        requests.push(request);
        return Parser.parseResponse(responses.shift());
    } } };
    try {
        const first = await ytmusic.getHomeSectionPage({ browseId: 'test-browse', params: 'test-params' });
        assert.deepEqual(first.items.map(item => item.data.id), ['first', 'second']);
        assert.equal(first.continuation, 'next');
        const last = await ytmusic.getHomeSectionPage({ continuation: first.continuation });
        assert.deepEqual(last.items.map(item => item.data.id), ['third']);
        assert.equal(last.continuation, null);
        assert.equal(requests[0].params, 'test-params');
        assert.equal(requests[1].continuation, 'next');
        assert.ok(requests.every(request => request.client === 'YTMUSIC'));
    } finally { ytmusic.musicAuthenticationInnertube = original; }
});

test('section loading requires an authenticated client and propagates retryable upstream errors', async () => {
    const original = ytmusic.musicAuthenticationInnertube;
    try {
        ytmusic.musicAuthenticationInnertube = undefined;
        await assert.rejects(ytmusic.getHomeSectionPage({ browseId: 'test' }), /cookie authentication is not configured/);
        ytmusic.musicAuthenticationInnertube = { actions: { execute: async () => { throw new Error('temporary upstream failure'); } } };
        await assert.rejects(ytmusic.getHomeSectionPage({ continuation: 'test' }), /temporary upstream failure/);
    } finally { ytmusic.musicAuthenticationInnertube = original; }
});
