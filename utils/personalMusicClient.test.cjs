const assert = require('node:assert/strict');
const test = require('node:test');
const { Constants } = require('youtubei.js');
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

test('records playback start with authenticated track info', async () => {
    const calls = [];
    const trackInfo = {
        addToWatchHistory: async () => {
            calls.push(['playback']);
            return { ok: true };
        }
    };
    const client = Object.create(PersonalMusicClient.prototype);
    Object.defineProperties(client, {
        innertube: { value: { music: { getInfo: async () => trackInfo } } },
        tokenProvider: { value: { getToken: async () => 'po-token' } }
    });

    await client.addTrackToHistory('track-1');

    assert.deepEqual(calls, [['playback']]);
});

test('reports WEB playback tracking as YouTube Music when YTMusic omits it', async () => {
    const calls = [];
    const client = Object.create(PersonalMusicClient.prototype);
    Object.defineProperties(client, {
        innertube: {
            value: {
                music: {
                    getInfo: async () => ({
                        addToWatchHistory: async () => { throw new Error('Playback tracking not available'); }
                    })
                },
                getBasicInfo: async (id, options) => {
                    calls.push([id, options]);
                    return {
                        cpn: 'content-playback-nonce',
                        page: [{
                            playback_tracking: {
                                videostats_playback_url: 'https://s.youtube.com/api/stats/playback?docid=track-1'
                            }
                        }]
                    };
                },
                actions: {
                    stats: async (...args) => {
                        calls.push(args);
                        return { ok: true };
                    }
                }
            }
        },
        tokenProvider: { value: { getToken: async () => 'po-token' } }
    });

    await client.addTrackToHistory('track-1');

    assert.deepEqual(calls, [
        ['track-1', { client: 'WEB' }],
        [
            'https://music.youtube.com/api/stats/playback?docid=track-1',
            { client_name: 'WEB_REMIX', client_version: Constants.CLIENTS.YTMUSIC.VERSION },
            { cpn: 'content-playback-nonce', fmt: 251, rtn: 0, rt: 0 }
        ]
    ]);
});

test('does not report rejected YouTube playback tracking as success', async () => {
    const client = Object.create(PersonalMusicClient.prototype);
    Object.defineProperties(client, {
        innertube: {
            value: {
                music: {
                    getInfo: async () => ({
                        addToWatchHistory: async () => ({ ok: false, status: 403 })
                    })
                }
            }
        },
        tokenProvider: { value: { getToken: async () => 'po-token' } }
    });

    await assert.rejects(
        client.addTrackToHistory('track-1'),
        error => error.status === 502 && /403/.test(error.message)
    );
});
