const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Parser } = require('youtubei.js');
const { PersonalMusicClient } = require('./personalMusicClient.ts');

const card = id => ({ musicTwoRowItemRenderer: {
    title: { runs: [{ text: id }] }, subtitle: { runs: [{ text: 'Song' }] },
    navigationEndpoint: { watchEndpoint: { videoId: id } },
    thumbnailRenderer: { musicThumbnailRenderer: { thumbnail: { thumbnails: [] } } }
} });

test('section browse and grid continuation preserve order and stop at the last page', async () => {
    const requests = [];
    const responses = [
        { contents: { gridRenderer: { items: [card('first'), card('second')], continuations: [{ nextContinuationData: { continuation: 'next' } }] } } },
        { continuationContents: { gridContinuation: { items: [card('third')] } } }
    ];
    const client = new PersonalMusicClient({ actions: { execute: async (path, request) => {
        assert.equal(path, '/browse');
        requests.push(request);
        return Parser.parseResponse(responses.shift());
    } } }, {});
        const first = await client.getHomeSectionPage({ browseId: 'test-browse', params: 'test-params' });
        assert.deepEqual(first.items.map(item => item.data.id), ['first', 'second']);
        assert.equal(first.continuation, 'next');
        const last = await client.getHomeSectionPage({ continuation: first.continuation });
        assert.deepEqual(last.items.map(item => item.data.id), ['third']);
        assert.equal(last.continuation, null);
        assert.equal(requests[0].params, 'test-params');
        assert.equal(requests[1].continuation, 'next');
        assert.ok(requests.every(request => request.client === 'YTMUSIC'));
});

test('section loading propagates retryable upstream errors', async () => {
    const client = new PersonalMusicClient({
        actions: { execute: async () => { throw new Error('temporary upstream failure'); } }
    }, {});
    await assert.rejects(client.getHomeSectionPage({ continuation: 'test' }), /temporary upstream failure/);
});
