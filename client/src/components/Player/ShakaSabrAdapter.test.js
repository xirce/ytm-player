import { ShakaSabrPlayerAdapter } from './ShakaSabrAdapter';

const mockProcessChunk = jest.fn();

jest.mock('googlevideo/sabr-streaming-adapter', () => ({
    SabrUmpProcessor: class {
        processChunk(data) { return mockProcessChunk(data); }
    },
    SabrStreamingAdapter: jest.fn()
}), { virtual: true });

describe('ShakaSabrPlayerAdapter', () => {
    beforeAll(() => {
        if (typeof TextDecoder === 'undefined') {
            Object.defineProperty(global, 'TextDecoder', {
                configurable: true,
                value: require('util').TextDecoder
            });
        }
    });

    beforeEach(() => {
        mockProcessChunk.mockReset();
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: jest.fn(() => 'blob:http://localhost/cached-init')
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            value: jest.fn()
        });
    });

    it('returns a SABR segment at MediaEnd without waiting for the response to close', async () => {
        mockProcessChunk
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ data: new Uint8Array([7, 8, 9]), done: true });
        const cancel = jest.fn().mockResolvedValue(undefined);
        const read = jest.fn()
            .mockResolvedValueOnce({ done: false, value: new Uint8Array([1]) })
            .mockResolvedValueOnce({ done: false, value: new Uint8Array([2]) })
            .mockResolvedValueOnce({ done: false, value: new Uint8Array([3]) });
        const adapter = new ShakaSabrPlayerAdapter(
            { getNetworkingEngine: () => ({ registerRequestFilter: jest.fn(), registerResponseFilter: jest.fn() }) },
            {},
            1
        );
        adapter.initialize(null, { getRequestMetadata: () => ({ isUMP: true }) }, {});
        const abortRequest = jest.fn();

        const result = await adapter.readResponseData('https://example.test/sabr', {
            body: { getReader: () => ({ read, cancel }) }
        }, abortRequest);

        expect(new Uint8Array(result.data)).toEqual(new Uint8Array([7, 8, 9]));
        expect(result.receivedBytes).toBe(2);
        expect(result.responseHash).toMatch(/^[0-9a-f]{8}$/);
        expect(result.prefixHash).toBe(result.responseHash);
        expect(result.mediaEndBytes).toBe(2);
        expect(read).toHaveBeenCalledTimes(2);
        expect(abortRequest).toHaveBeenCalledTimes(1);
        expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('streams a primary Shaka SABR request and aborts its unused UMP tail', async () => {
        let requestFilter;
        let responseFilter;
        let schemePlugin;
        const networkingEngine = {
            registerRequestFilter: jest.fn(filter => { requestFilter = filter; }),
            registerResponseFilter: jest.fn(filter => { responseFilter = filter; })
        };
        const runtime = {
            registerScheme: jest.fn((_scheme, plugin) => { schemePlugin = plugin; }),
            unregisterScheme: jest.fn(),
            createAbortableOperation: (promise, onAbort) => ({ promise, abort: onAbort })
        };
        const cancel = jest.fn().mockResolvedValue(undefined);
        const read = jest.fn()
            .mockResolvedValueOnce({ done: false, value: new Uint8Array([1]) })
            .mockResolvedValueOnce({ done: false, value: new Uint8Array([2]) })
            .mockResolvedValueOnce({ done: false, value: new Uint8Array([3]) });
        const originalFetch = global.fetch;
        global.fetch = jest.fn()
        .mockResolvedValueOnce({
            body: { getReader: () => ({ read, cancel }) },
            headers: new Map([
                ['content-type', 'application/x-protobuf'],
                ['server-timing', 'sabr-upstream-headers-ms;dur=12.5, sabr-downstream-first-write-ms;dur=14'],
                ['x-sabr-diagnostic-id', 'request-1']
            ]),
            status: 200
        })
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                upstreamReadCompleteMs: 18,
                downstreamFirstWriteMs: 14,
                downstreamCloseMs: 20,
                prematureClose: true,
                backpressureCount: 1,
                firstBackpressureMs: 15
            })
        });
        mockProcessChunk
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce({ data: new Uint8Array([7, 8, 9]), done: true });
        const timing = jest.fn();
        const adapter = new ShakaSabrPlayerAdapter(
            { getNetworkingEngine: () => networkingEngine }, {}, 1, timing, runtime
        );
        adapter.initialize(null, { getRequestMetadata: () => ({ isUMP: true }) }, {});
        adapter.registerRequestInterceptor(request => ({
            ...request,
            url: 'https://rr1.googlevideo.com/videoplayback?rn=1'
        }));
        adapter.registerResponseInterceptor(response => response);
        const request = {
            uris: ['sabr://stream?key=251%3A'], method: 'GET', headers: { Range: 'bytes=0-65535' }
        };

        try {
            await requestFilter(1, request, { segment: { startTime: 0 } });
            expect(request.uris[0]).toMatch(/^ytmsabr\d+:/);

            const operation = schemePlugin(
                request.uris[0], request, 1, jest.fn(), jest.fn()
            );
            const response = await operation.promise;
            await responseFilter(1, response, { segment: { startTime: 0 } });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/tracks/sabr-proxy?'),
                expect.objectContaining({ signal: expect.any(AbortSignal) })
            );
            expect(new Uint8Array(response.data)).toEqual(new Uint8Array([7, 8, 9]));
            expect(read).toHaveBeenCalledTimes(2);
            expect(cancel).toHaveBeenCalledTimes(1);
            expect(timing.mock.calls.find(([event]) => event.phase === 'response')[0])
                .toMatchObject({
                    bytes: 2,
                    mediaEndBytes: 2,
                    resourceTiming: {
                        encodedBodySize: 2,
                        serverTiming: [
                            { name: 'sabr-upstream-headers-ms', duration: 12.5 },
                            { name: 'sabr-downstream-first-write-ms', duration: 14 }
                        ]
                    }
                });
            await Promise.resolve();
            await Promise.resolve();
            expect(global.fetch).toHaveBeenCalledWith('/api/tracks/sabr-proxy-diagnostic?id=request-1');
            expect(timing.mock.calls.find(([event]) => event.phase === 'server')[0])
                .toMatchObject({
                    proxyDiagnostic: {
                        upstreamReadCompleteMs: 18,
                        downstreamCloseMs: 20,
                        prematureClose: true,
                        backpressureCount: 1
                    }
                });
        } finally {
            adapter.dispose();
            global.fetch = originalFetch;
        }
    });

    it('serves a following init range from the full SABR init response cache', async () => {
        let requestFilter;
        let responseFilter;
        const networkingEngine = {
            registerRequestFilter: jest.fn(filter => { requestFilter = filter; }),
            registerResponseFilter: jest.fn(filter => { responseFilter = filter; })
        };
        const requestInterceptor = jest.fn();
        const timing = jest.fn();
        const fullInit = new Uint8Array([10, 11, 12, 13, 14, 15]);
        const cache = {
            getCacheEntries: () => ({
                initSegmentCache: new Map([['251::6:audio/mp4', { data: fullInit }]])
            }),
            getInitSegment: jest.fn(() => fullInit)
        };
        const adapter = new ShakaSabrPlayerAdapter(
            { getNetworkingEngine: () => networkingEngine },
            {},
            1,
            timing
        );
        adapter.initialize(null, { getRequestMetadata: jest.fn() }, cache);
        adapter.registerRequestInterceptor(requestInterceptor);
        const request = {
            uris: ['sabr://stream?key=251%3A'],
            method: 'GET',
            headers: { Range: 'bytes=2-4' }
        };

        await requestFilter(1, request);

        expect(requestInterceptor).not.toHaveBeenCalled();
        expect(cache.getInitSegment).toHaveBeenCalledWith('251::6:audio/mp4');
        expect(request).toMatchObject({
            uris: ['blob:http://localhost/cached-init'],
            method: 'GET',
            headers: {},
            body: null
        });
        expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));

        await responseFilter(1, {
            uri: request.uris[0],
            data: new Uint8Array([12, 13, 14]).buffer,
            headers: {},
            originalRequest: request
        });

        expect(timing.mock.calls.map(([event]) => event.phase))
            .toEqual(['request', 'response', 'processed', 'delivered']);
        expect(timing.mock.calls[0][0].range).toBe('2-4');
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(request.uris[0]);
    });

    it('seeds index, init, and the first media prefix with one direct range request', async () => {
        let requestFilter;
        let responseFilter;
        let objectUrlIndex = 0;
        URL.createObjectURL.mockImplementation(() => `blob:http://localhost/coalesced-${objectUrlIndex++}`);
        const networkingEngine = {
            registerRequestFilter: jest.fn(filter => { requestFilter = filter; }),
            registerResponseFilter: jest.fn(filter => { responseFilter = filter; })
        };
        const intercepted = [];
        const requestInterceptor = jest.fn(request => {
            intercepted.push({ range: request.headers.Range, isInit: request.segment.isInit() });
            return { ...request, url: 'https://rr1.googlevideo.com/videoplayback?rn=1' };
        });
        const responseInterceptor = jest.fn(response => response);
        const timing = jest.fn();
        const prefix = Uint8Array.from({ length: 65544 }, (_, index) => index % 251);
        const diagnosticFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            arrayBuffer: async () => prefix.buffer
        });
        const adapter = new ShakaSabrPlayerAdapter(
            { getNetworkingEngine: () => networkingEngine },
            {},
            1,
            timing
        );
        mockProcessChunk.mockImplementation(async data => ({ data, done: true }));
        adapter.initialize(null, { getRequestMetadata: () => ({ isUMP: true }) }, {});
        adapter.registerRequestInterceptor(requestInterceptor);
        adapter.registerResponseInterceptor(responseInterceptor);
        adapter.configureInitialRanges(`
            <MPD><Period><AdaptationSet><Representation id="251">
                <BaseURL>sabr://stream?key=251%3A</BaseURL>
                <SegmentBase indexRange="4-7"><Initialization range="0-3" /></SegmentBase>
            </Representation></AdaptationSet></Period></MPD>
        `, [{
            itag: 251,
            content_length: 70000,
            seedUrl: '/api/tracks/proxy?url=media'
        }]);

        const indexRequest = {
            uris: ['sabr://stream?key=251%3A'], method: 'GET', headers: { Range: 'bytes=4-7' }
        };
        await requestFilter(1, indexRequest);
        expect(intercepted).toEqual([]);
        expect(indexRequest.uris[0]).toBe('blob:http://localhost/coalesced-0');
        expect(diagnosticFetch).toHaveBeenCalledWith(
            '/api/tracks/proxy?url=media',
            expect.objectContaining({ headers: { Range: 'bytes=0-65543' } })
        );
        diagnosticFetch.mockRestore();

        const indexResponse = {
            uri: indexRequest.uris[0], data: prefix.slice(4, 8).buffer, headers: {}, originalRequest: indexRequest
        };
        await responseFilter(1, indexResponse);
        expect(new Uint8Array(indexResponse.data)).toEqual(prefix.slice(4, 8));

        const initRequest = {
            uris: ['sabr://stream?key=251%3A'], method: 'GET', headers: { Range: 'bytes=0-3' }
        };
        await requestFilter(1, initRequest);
        expect(initRequest.uris[0]).toBe('blob:http://localhost/coalesced-1');
        expect(requestInterceptor).not.toHaveBeenCalled();
        expect(timing.mock.calls.at(-1)[0]).toMatchObject({
            phase: 'request', coalescingStatus: 'cache-hit', networkRange: '0-3'
        });

        const mediaRequest = {
            uris: ['sabr://stream?key=251%3A'], method: 'GET', headers: { Range: 'bytes=8-65550' }
        };
        const mediaContext = { segment: { startTime: 0 } };
        await requestFilter(1, mediaRequest, mediaContext);
        expect(intercepted[0]).toEqual({ range: 'bytes=65544-65550', isInit: false });

        const tail = new Uint8Array([91, 92, 93, 94, 95, 96, 97]);
        const mediaResponse = {
            uri: mediaRequest.uris[0], data: tail.buffer, headers: {}, originalRequest: mediaRequest
        };
        await responseFilter(1, mediaResponse, mediaContext);
        const media = new Uint8Array(mediaResponse.data);
        expect(media.byteLength).toBe(65543);
        expect(media.slice(0, 4)).toEqual(prefix.slice(8, 12));
        expect(media.slice(-7)).toEqual(tail);
    });

    it('falls back to the original SABR index request when direct seeding fails', async () => {
        let requestFilter;
        let responseFilter;
        const networkingEngine = {
            registerRequestFilter: jest.fn(filter => { requestFilter = filter; }),
            registerResponseFilter: jest.fn(filter => { responseFilter = filter; })
        };
        const requestInterceptor = jest.fn(request => ({
            ...request,
            url: 'https://rr1.googlevideo.com/videoplayback?rn=1'
        }));
        const timing = jest.fn();
        const adapter = new ShakaSabrPlayerAdapter(
            { getNetworkingEngine: () => networkingEngine },
            {},
            1,
            timing
        );
        const seedFetch = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('seed failed'));
        adapter.initialize(null, { getRequestMetadata: () => ({ isUMP: true }) }, {});
        adapter.registerRequestInterceptor(requestInterceptor);
        adapter.registerResponseInterceptor(response => response);
        adapter.configureInitialRanges(`
            <MPD><Period><AdaptationSet><Representation id="251">
                <BaseURL>sabr://stream?key=251%3A</BaseURL>
                <SegmentBase indexRange="4-7"><Initialization range="0-3" /></SegmentBase>
            </Representation></AdaptationSet></Period></MPD>
        `, [{ itag: 251, content_length: 70000, seedUrl: '/api/tracks/proxy?url=media' }]);

        const indexRequest = {
            uris: ['sabr://stream?key=251%3A'], method: 'GET', headers: { Range: 'bytes=4-7' }
        };
        await requestFilter(1, indexRequest);
        expect(seedFetch).toHaveBeenCalledWith('/api/tracks/proxy?url=media', expect.any(Object));
        expect(requestInterceptor).toHaveBeenCalledTimes(1);
        expect(requestInterceptor.mock.calls[0][0].headers.Range).toBe('bytes=4-7');
        expect(requestInterceptor.mock.calls[0][0].segment.isInit()).toBe(true);
        seedFetch.mockRestore();
    });

    it('configures the combined initial range from a Base64 MPD data URI', async () => {
        let requestFilter;
        const networkingEngine = {
            registerRequestFilter: jest.fn(filter => { requestFilter = filter; }),
            registerResponseFilter: jest.fn()
        };
        const requestInterceptor = jest.fn(request => request);
        const adapter = new ShakaSabrPlayerAdapter(
            { getNetworkingEngine: () => networkingEngine },
            {},
            1
        );
        adapter.initialize(null, { getRequestMetadata: jest.fn() }, {});
        adapter.registerRequestInterceptor(requestInterceptor);
        const seed = new Uint8Array(66919);
        const seedFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            status: 200,
            arrayBuffer: async () => seed.buffer
        });
        adapter.configureInitialRanges(
            'data:application/dash+xml;charset=utf-8;base64,'
                + 'PE1QRD48UGVyaW9kPjxBZGFwdGF0aW9uU2V0PjxSZXByZXNlbnRhdGlvbiBpZD0iMjUxIj48QmFzZVVSTD5zYWJyOi8v'
                + 'c3RyZWFtP2tleT0yNTElM0E8L0Jhc2VVUkw+PFNlZ21lbnRCYXNlIGluZGV4UmFuZ2U9Ijc1OS0xMzgyIj48SW5pdGlh'
                + 'bGl6YXRpb24gcmFuZ2U9IjAtNzU4IiAvPjwvU2VnbWVudEJhc2U+PC9SZXByZXNlbnRhdGlvbj48L0FkYXB0YXRpb25T'
                + 'ZXQ+PC9QZXJpb2Q+PC9NUEQ+',
            [{ itag: 251, content_length: 3000000, seedUrl: '/api/tracks/proxy?url=media' }]
        );
        const request = {
            uris: ['sabr://stream?key=251%3A'], method: 'GET', headers: { Range: 'bytes=759-1382' }
        };

        await requestFilter(1, request);

        expect(seedFetch).toHaveBeenCalledWith(
            '/api/tracks/proxy?url=media',
            expect.objectContaining({ headers: { Range: 'bytes=0-66918' } })
        );
        expect(requestInterceptor).not.toHaveBeenCalled();
        seedFetch.mockRestore();
    });

    it('marks only the first two network requests for server-side hedging', () => {
        const adapter = new ShakaSabrPlayerAdapter(
            { getNetworkingEngine: () => ({ registerRequestFilter: jest.fn(), registerResponseFilter: jest.fn() }) },
            {},
            1
        );
        const mediaUrl = 'https://rr1.googlevideo.com/videoplayback?rn=7';
        const proxyUrls = [0, 1, 2].map(() => new URL(
            adapter.toProxyUrl(mediaUrl, adapter.takeHedgeSlot())
        ));

        expect(proxyUrls.map(url => url.searchParams.get('hedge'))).toEqual(['1', '1', null]);
        expect(proxyUrls[0].searchParams.get('rn')).toBe('7');

        adapter.resetTiming();

        expect(new URL(adapter.toProxyUrl(mediaUrl, adapter.takeHedgeSlot())).searchParams.get('hedge')).toBe('1');
    });
});
