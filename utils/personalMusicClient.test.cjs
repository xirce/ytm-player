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

test('starts WEB playback tracking as YouTube Music and keeps its watch-time session', async () => {
    const calls = [];
    const client = Object.create(PersonalMusicClient.prototype);
    Object.defineProperty(client, 'innertube', {
        value: {
            getBasicInfo: async (id, options) => {
                calls.push([id, options]);
                return {
                    cpn: 'content-playback-nonce',
                    page: [{ playback_tracking: {
                        videostats_playback_url: 'https://s.youtube.com/api/stats/playback?docid=track-1',
                        videostats_watchtime_url: 'https://s.youtube.com/api/stats/watchtime?docid=track-1'
                    } }]
                };
            },
            actions: {
                stats: async (...args) => {
                    calls.push(args);
                    return { ok: true };
                }
            }
        }
    });

    const session = await client.startPlaybackTracking('track-1', 12.5);

    assert.deepEqual(calls[0], ['track-1', { client: 'WEB' }]);
    assert.deepEqual(calls[1], [
        'https://music.youtube.com/api/stats/playback?docid=track-1',
        { client_name: 'WEB_REMIX', client_version: Constants.CLIENTS.YTMUSIC.VERSION },
        { cpn: 'content-playback-nonce', fmt: 251, rtn: 0, rt: 0, cmt: '12.500', final: '0' }
    ]);
    assert.match(session.sessionId, /^[0-9a-f-]{36}$/);
    assert.deepEqual(session.scheduledFlushSeconds, [10, 20, 30]);
    assert.equal(session.defaultFlushSeconds, 40);
});

test('reports watched ranges and closes the session on the final ping', async () => {
    const calls = [];
    const client = Object.create(PersonalMusicClient.prototype);
    Object.defineProperty(client, 'innertube', {
        value: { actions: { stats: async (...args) => { calls.push(args); return { ok: true }; } } }
    });
    Object.defineProperty(client, 'playbackSessions', { value: new Map([['session-1', {
        trackId: 'track-1', cpn: 'cpn-1', watchTimeUrl: 'https://music.youtube.com/api/stats/watchtime',
        startedAt: Date.now(), lastUsed: Date.now()
    }]]), writable: true });

    await client.updatePlaybackTracking('track-1', 'session-1', [
        { start: 0, end: 9.25 }, { start: 30, end: 34.5 }
    ], 34.5, true);

    assert.equal(calls[0][0], 'https://music.youtube.com/api/stats/watchtime');
    assert.deepEqual(calls[0][1], {
        client_name: 'WEB_REMIX', client_version: Constants.CLIENTS.YTMUSIC.VERSION
    });
    assert.equal(calls[0][2].cpn, 'cpn-1');
    assert.equal(calls[0][2].st, '0.000,30.000');
    assert.equal(calls[0][2].et, '9.250,34.500');
    assert.equal(calls[0][2].cmt, '34.500');
    assert.equal(calls[0][2].final, '1');
    await assert.rejects(
        client.updatePlaybackTracking('track-1', 'session-1', [], 34.5, true),
        error => error.status === 404
    );
});

test('does not retain a session when YouTube rejects playback tracking', async () => {
    const client = Object.create(PersonalMusicClient.prototype);
    Object.defineProperty(client, 'innertube', { value: {
        getBasicInfo: async () => ({
            cpn: 'cpn-1',
            page: [{ playback_tracking: {
                videostats_playback_url: 'https://s.youtube.com/api/stats/playback',
                videostats_watchtime_url: 'https://s.youtube.com/api/stats/watchtime'
            } }]
        }),
        actions: { stats: async () => ({ ok: false, status: 403 }) }
    } });

    await assert.rejects(
        client.startPlaybackTracking('track-1', 0),
        error => error.status === 502 && /403/.test(error.message)
    );
    assert.equal(client.playbackSessions, undefined);
});
