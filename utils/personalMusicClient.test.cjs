const assert = require('node:assert/strict');
const test = require('node:test');
const { PersonalMusicClient } = require('./personalMusicClient.ts');

test('sends ratings with the LikeTarget shape expected by YouTube', async () => {
    const calls = [];
    const client = Object.create(PersonalMusicClient.prototype);
    Object.defineProperty(client, 'innertube', {
        value: {
            actions: {
                execute: async (endpoint, payload) => {
                    calls.push({ endpoint, payload });
                    return { success: true };
                }
            }
        }
    });

    for (const [rating, endpoint] of [
        ['LIKE', '/like/like'],
        ['DISLIKE', '/like/dislike'],
        ['INDIFFERENT', '/like/removelike']
    ]) {
        await client.setTrackRating('MwIEC12Xoz0', rating);
        assert.deepEqual(calls[calls.length - 1], {
            endpoint,
            payload: { target: { videoId: 'MwIEC12Xoz0' }, client: 'TV' }
        });
    }
});

test('loads system and personalized playlists through the authenticated client', async () => {
    const calls = [];
    const client = Object.create(PersonalMusicClient.prototype);
    Object.defineProperty(client, 'innertube', {
        value: {
            music: {
                getPlaylist: async id => {
                    calls.push(id);
                    return { header: undefined, items: [] };
                }
            }
        }
    });

    const liked = await client.getPlaylistWithVideos('LM');
    const mix = await client.getPlaylistWithVideos('RDTMAK5uy_mix');

    assert.deepEqual(calls, ['VLLM', 'VLRDTMAK5uy_mix']);
    assert.equal(liked.info.id, 'LM');
    assert.equal(mix.info.id, 'RDTMAK5uy_mix');
    assert.deepEqual(mix.tracks, []);
});

test('reads the existing rating from VideoInfo', async () => {
    const client = Object.create(PersonalMusicClient.prototype);
    Object.defineProperties(client, {
        innertube: {
            value: {
                getInfo: async () => ({ basic_info: { is_liked: true, is_disliked: false } }),
                music: { getInfo: () => { throw new Error('YTMusic.TrackInfo must not be used'); } }
            }
        },
        tokenProvider: { value: { getToken: async () => 'po-token' } }
    });

    assert.equal(await client.getTrackRating('track-1'), 'LIKE');
});
