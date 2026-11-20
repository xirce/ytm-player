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

const statsClient = { client_name: 'WEB_REMIX', client_version: Constants.CLIENTS.YTMUSIC.VERSION };
const statsUrl = (host, kind, source) => `https://${host}.youtube.com/api/stats/${kind}?source=${source}`;
const tracking = (source, kinds = ['playback', 'watchtime']) => Object.fromEntries(kinds.map(kind => [
    kind === 'playback' ? 'videostatsPlaybackUrl' : 'videostatsWatchtimeUrl',
    { baseUrl: statsUrl('s', kind, source) }
]));

function mockPlaybackClient(responses, sendStats = async () => ({ ok: true }), getToken = async () => 'synthetic-po-token') {
    const client = Object.create(PersonalMusicClient.prototype);
    const playerCalls = [];
    const statsCalls = [];
    const tokenCalls = [];
    Object.defineProperties(client, {
        innertube: {
            value: {
                session: {},
                actions: {
                    execute: async (endpoint, payload) => {
                        playerCalls.push({ endpoint, payload });
                        const data = responses[payload.client];
                        if (data instanceof Error) throw data;
                        return { success: true, data };
                    },
                    stats: async (...args) => {
                        statsCalls.push(args);
                        return sendStats(...args);
                    }
                }
            }
        },
        tokenProvider: {
            value: { getToken: async id => {
                tokenCalls.push(id);
                return getToken(id);
            } }
        }
    });
    return { client, playerCalls, statsCalls, tokenCalls };
}

test('starts WEB playback tracking as YouTube Music and uses the same nonce for watch time', async () => {
    const { client, playerCalls, statsCalls, tokenCalls } = mockPlaybackClient({
        WEB: { playbackTracking: tracking('web') }
    });

    const session = await client.startPlaybackTracking('track-1', 12.5);
    await client.updatePlaybackTracking('track-1', session.sessionId, [{ start: 12.5, end: 15 }], 15, false);

    assert.deepEqual(playerCalls.map(({ endpoint, payload }) => [endpoint, payload.videoId, payload.client]), [
        ['/player', 'track-1', 'WEB']
    ]);
    assert.deepEqual(tokenCalls, []);
    assert.equal(statsCalls.length, 2);
    const cpn = statsCalls[0][2].cpn;
    assert.match(cpn, /^[A-Za-z0-9_-]{16}$/);
    assert.deepEqual(statsCalls[0], [statsUrl('music', 'playback', 'web'), statsClient, {
        cpn, fmt: 251, rtn: 0, rt: 0, cmt: '12.500', final: '0'
    }]);
    assert.equal(statsCalls[1][0], statsUrl('music', 'watchtime', 'web'));
    assert.equal(statsCalls[1][2].cpn, cpn);
    assert.match(session.sessionId, /^[0-9a-f-]{36}$/);
    assert.deepEqual(session.scheduledFlushSeconds, [10, 20, 30]);
    assert.equal(session.defaultFlushSeconds, 40);
});

test('requests the token-bound Music player when WEB has no tracking', async () => {
    const { client, playerCalls, statsCalls, tokenCalls } = mockPlaybackClient({
        WEB: { playabilityStatus: { status: 'OK' } },
        YTMUSIC: { playerResponse: { playbackTracking: tracking('music') } }
    });

    const session = await client.startPlaybackTracking('track-1', 0);

    assert.deepEqual(tokenCalls, ['track-1']);
    assert.deepEqual(playerCalls.map(({ payload }) => payload.client), ['WEB', 'YTMUSIC']);
    assert.deepEqual(playerCalls[1], {
        endpoint: '/player',
        payload: {
            videoId: 'track-1', client: 'YTMUSIC', racyCheckOk: true, contentCheckOk: true,
            playbackContext: { contentPlaybackContext: {
                vis: 0, splay: false, lactMilliseconds: '-1', signatureTimestamp: undefined
            } },
            serviceIntegrityDimensions: { poToken: 'synthetic-po-token' }
        }
    });
    assert.deepEqual(statsCalls.map(([url]) => url), [statsUrl('music', 'playback', 'music')]);
    assert.equal(client.playbackSessions.get(session.sessionId).watchTimeUrl, statsUrl('music', 'watchtime', 'music'));
});

test('prefers the Music tracking pair when WEB provides only the playback URL', async () => {
    const { client, statsCalls } = mockPlaybackClient({
        WEB: { playbackTracking: tracking('web', ['playback']) },
        YTMUSIC: { playbackTracking: tracking('music') }
    });

    const session = await client.startPlaybackTracking('track-1', 0);

    assert.deepEqual(statsCalls.map(([url]) => url), [statsUrl('music', 'playback', 'music')]);
    assert.equal(client.playbackSessions.get(session.sessionId).watchTimeUrl, statsUrl('music', 'watchtime', 'music'));
});

test('reports playback without a watch-time session when only the playback URL is usable', async () => {
    const { client, statsCalls } = mockPlaybackClient({
        WEB: { playbackTracking: tracking('web', ['playback']) },
        YTMUSIC: { playbackTracking: tracking('music', ['watchtime']) }
    });

    assert.deepEqual(await client.startPlaybackTracking('track-1', 0), { sessionId: null });
    assert.deepEqual(statsCalls.map(([url]) => url), [statsUrl('music', 'playback', 'web')]);
    assert.equal(client.playbackSessions, undefined);
});

test('fails safely when neither player provides a playback URL', async () => {
    const { client, statsCalls } = mockPlaybackClient({
        WEB: { playbackTracking: tracking('web', ['watchtime']) },
        YTMUSIC: null
    });

    await assert.rejects(client.startPlaybackTracking('track-1', 0), {
        status: 502, message: 'YouTube did not provide playback tracking'
    });
    assert.deepEqual(statsCalls, []);
    assert.equal(client.playbackSessions, undefined);
});

test('uses the WEB playback URL if the token provider is unavailable', async () => {
    const { client, playerCalls, statsCalls } = mockPlaybackClient(
        { WEB: { playbackTracking: tracking('web', ['playback']) } },
        undefined,
        async () => { throw new Error('private token provider details'); }
    );

    assert.deepEqual(await client.startPlaybackTracking('track-1', 0), { sessionId: null });
    assert.equal(playerCalls.length, 1);
    assert.deepEqual(statsCalls.map(([url]) => url), [statsUrl('music', 'playback', 'web')]);
});

test('uses the WEB playback URL if the Music player refuses playback', async () => {
    const { client, statsCalls } = mockPlaybackClient({
        WEB: { playbackTracking: tracking('web', ['playback']) },
        YTMUSIC: { playabilityStatus: { status: 'LOGIN_REQUIRED' } }
    });

    assert.deepEqual(await client.startPlaybackTracking('track-1', 0), { sessionId: null });
    assert.deepEqual(statsCalls.map(([url]) => url), [statsUrl('music', 'playback', 'web')]);
});

test('does not try the alternate player when YouTube explicitly requires login', async () => {
    const { client, playerCalls, statsCalls, tokenCalls } = mockPlaybackClient({
        WEB: { playabilityStatus: { status: 'LOGIN_REQUIRED' } },
        YTMUSIC: { playbackTracking: tracking('music') }
    });

    await assert.rejects(client.startPlaybackTracking('track-1', 0), { status: 502 });
    assert.equal(playerCalls.length, 1);
    assert.deepEqual(tokenCalls, []);
    assert.deepEqual(statsCalls, []);
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
    const { client, playerCalls, statsCalls } = mockPlaybackClient({
        WEB: { playbackTracking: tracking('web') },
        YTMUSIC: { playbackTracking: tracking('music') }
    }, async () => ({ ok: false, status: 403 }));

    await assert.rejects(
        client.startPlaybackTracking('track-1', 0),
        error => error.status === 502 && /403/.test(error.message)
    );
    assert.equal(playerCalls.length, 1);
    assert.equal(statsCalls.length, 1);
    assert.equal(client.playbackSessions, undefined);
});

test('does not expose a thrown stats error, retry the ping, or leave a session', async () => {
    const { client, playerCalls, statsCalls } = mockPlaybackClient({ WEB: { playbackTracking: tracking('web') } },
        async () => { throw new Error('private stats URL'); });

    await assert.rejects(client.startPlaybackTracking('track-1', 0), {
        status: 502, message: 'YouTube Music rejected playback tracking'
    });
    assert.equal(playerCalls.length, 1);
    assert.equal(statsCalls.length, 1);
    assert.equal(client.playbackSessions, undefined);
});
