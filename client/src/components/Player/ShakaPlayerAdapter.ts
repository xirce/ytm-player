import * as shaka from 'shaka-player/dist/shaka-player.dash';
import type { ITrackPlaybackSource } from '../../../../shared';
import { createSabrAdapter, SabrTimingEvent, ShakaSabrPlayerAdapter } from './ShakaSabrAdapter';

export const PLAYER_EVENTS = {
    PLAYBACK_TIME_UPDATED: 'playbackTimeUpdated',
    PLAYBACK_METADATA_LOADED: 'playbackMetadataLoaded'
} as const;

type PlayerEventListener = (event?: any) => void;

interface ShakaRequest {
    uris: string[];
    headers: Record<string, string>;
}

interface ShakaResponse {
    originalRequest?: ShakaRequest;
}

interface ShakaRequestContext {
    type?: number;
}

interface ShakaNetworkingEngine {
    registerRequestFilter(filter: (type: number, request: ShakaRequest, context?: ShakaRequestContext) => void): void;
    registerResponseFilter(filter: (type: number, response: ShakaResponse, context?: ShakaRequestContext) => void): void;
}

interface ShakaPlayerInstance {
    addEventListener(type: string, listener: EventListener): void;
    attach(element: HTMLMediaElement): Promise<unknown>;
    configure(config: object): boolean;
    destroy(): Promise<unknown>;
    getNetworkingEngine(): ShakaNetworkingEngine | null;
    getStats(): { estimatedBandwidth?: number };
    load(uri: string, startTime?: number | null, mimeType?: string): Promise<unknown>;
    unload(): Promise<unknown>;
}

const shakaApi = shaka as unknown as {
    Player: {
        new (): ShakaPlayerInstance;
        isBrowserSupported(): boolean;
    };
    polyfill: {
        installAll(): void;
    };
    net: {
        NetworkingEngine: {
            RequestType: { SEGMENT: number };
            AdvancedRequestType: { INIT_SEGMENT: number; MEDIA_SEGMENT: number };
            registerScheme(scheme: string, plugin: (...args: any[]) => any): void;
            unregisterScheme(scheme: string): void;
        };
    };
    util: {
        AbortableOperation: new <T>(promise: Promise<T>, onAbort: () => Promise<void>) => any;
    };
};

shakaApi.polyfill.installAll();

export class MediaPlayerClass {
    private element?: HTMLMediaElement;
    private shakaPlayer?: ShakaPlayerInstance;
    private playerReady: Promise<unknown> = Promise.resolve();
    private sourceGeneration = 0;
    private listeners = new Map<string, Set<PlayerEventListener>>();
    private initializationRanges = new Set<string>();
    private indexRanges = new Set<string>();
    private sabrBridge?: ShakaSabrPlayerAdapter;
    private sabrAdapter?: { dispose(): void };

    initialize(element: HTMLMediaElement, source?: string, autoplay = false): void {
        if (!shakaApi.Player.isBrowserSupported()) {
            throw new Error('Shaka Player is not supported in this browser');
        }

        this.element = element;
        this.element.autoplay = autoplay;
        this.shakaPlayer = new shakaApi.Player();
        this.shakaPlayer.configure({
            manifest: { disableVideo: true },
            streaming: {
                // Fetch the first audio segment while the manifest is being prepared.
                segmentPrefetchLimit: 1
            }
        });

        this.bindMediaEvents(element);
        this.bindShakaEvents(this.shakaPlayer);
        this.bindNetworkEvents(this.shakaPlayer);
        const { RequestType } = shakaApi.net.NetworkingEngine;
        this.sabrBridge = new ShakaSabrPlayerAdapter(
            this.shakaPlayer as any,
            element,
            RequestType.SEGMENT,
            event => this.emitSabrTiming(event),
            {
                registerScheme: (scheme, plugin) =>
                    shakaApi.net.NetworkingEngine.registerScheme(scheme, plugin),
                unregisterScheme: scheme => shakaApi.net.NetworkingEngine.unregisterScheme(scheme),
                createAbortableOperation: (promise, onAbort) =>
                    new shakaApi.util.AbortableOperation(promise, onAbort)
            }
        );
        this.playerReady = this.shakaPlayer.attach(element);
        if (source) this.attachSource(source);
    }

    attachSource(source: ITrackPlaybackSource | string): void {
        const generation = ++this.sourceGeneration;
        this.sabrBridge?.resetTiming();
        this.initializationRanges.clear();
        this.indexRanges.clear();
        if (!this.shakaPlayer) return;
        if (!source) {
            this.sabrAdapter?.dispose();
            this.sabrAdapter = undefined;
            void this.playerReady.then(() => this.shakaPlayer?.unload()).catch(() => undefined);
            return;
        }

        const manifest = typeof source === 'string' ? source : source.manifest;
        this.sabrAdapter?.dispose();
        this.sabrAdapter = undefined;
        if (typeof source !== 'string' && this.sabrBridge) {
            this.sabrBridge.configureInitialRanges(manifest, source.sabr.formats);
            this.sabrAdapter = createSabrAdapter(this.sabrBridge, source.sabr, this.shakaPlayer);
        }

        // The DASH-only Shaka bundle deliberately omits its data: URI plugin.
        // Keep the smaller bundle and expose the inline MPD through native blob: support.
        const manifestObjectUrl = this.createManifestObjectUrl(manifest);
        const manifestUrl = manifestObjectUrl ?? manifest;
        void this.playerReady
            // Blob URLs have no extension. Supplying the type prevents Shaka from
            // probing them with HEAD, which browsers reject for the blob: scheme.
            .then(() => {
                if (generation === this.sourceGeneration) this.emit('shakaLoadStarted');
                return this.shakaPlayer?.load(manifestUrl, null, 'application/dash+xml');
            })
            .then(() => {
                if (generation === this.sourceGeneration) this.emit('streamInitialized');
            })
            .catch(error => {
                // A newer source intentionally interrupts the previous load.
                if (generation === this.sourceGeneration) {
                    const shakaError = error as { category?: number; code?: number; data?: unknown[]; severity?: number };
                    console.error(
                        `Shaka Player load failed (code=${shakaError.code ?? 'unknown'})`,
                        {
                            category: shakaError.category,
                            code: shakaError.code,
                            data: shakaError.data,
                            severity: shakaError.severity
                        }
                    );
                }
            })
            .finally(() => {
                if (manifestObjectUrl) URL.revokeObjectURL(manifestObjectUrl);
            });
    }

    play(): void {
        void this.element?.play().catch(() => undefined);
    }

    pause(): void {
        this.element?.pause();
    }

    seek(position: number): void {
        if (this.element) this.element.currentTime = position;
    }

    time(): number {
        return this.element?.currentTime ?? 0;
    }

    duration(): number {
        return this.element?.duration ?? 0;
    }

    setVolume(volume: number): void {
        if (this.element) this.element.volume = volume;
    }

    getVolume(): number {
        return this.element?.volume ?? 1;
    }

    setMute(muted: boolean): void {
        if (this.element) this.element.muted = muted;
    }

    isMuted(): boolean {
        return this.element?.muted ?? false;
    }

    getVideoElement(): HTMLMediaElement | null {
        return this.element ?? null;
    }

    on(event: string, listener: PlayerEventListener): void {
        const listeners = this.listeners.get(event) ?? new Set<PlayerEventListener>();
        listeners.add(listener);
        this.listeners.set(event, listeners);
    }

    off(event: string, listener: PlayerEventListener): void {
        this.listeners.get(event)?.delete(listener);
    }

    reset(): void {
        this.sourceGeneration++;
        this.listeners.clear();
        const player = this.shakaPlayer;
        this.sabrAdapter?.dispose();
        this.sabrBridge?.dispose();
        this.sabrAdapter = undefined;
        this.sabrBridge = undefined;
        this.shakaPlayer = undefined;
        void player?.destroy().catch(() => undefined);
        this.element = undefined;
    }

    private emit(event: string, detail?: unknown): void {
        this.listeners.get(event)?.forEach(listener => listener(detail));
    }

    private createManifestObjectUrl(source: string): string | null {
        if (!source.startsWith('data:application/dash+xml')) return null;
        const separatorIndex = source.indexOf(',');
        if (separatorIndex < 0) return null;

        const metadata = source.slice(0, separatorIndex).toLowerCase();
        const payload = source.slice(separatorIndex + 1);
        const decodedBytes = metadata.includes(';base64')
            ? Uint8Array.from(atob(payload), character => character.charCodeAt(0))
            : null;
        const contents = decodedBytes ? new TextDecoder().decode(decodedBytes) : decodeURIComponent(payload);
        const document = new DOMParser().parseFromString(contents, 'application/xml');
        this.initializationRanges = new Set(
            Array.from(document.getElementsByTagNameNS('*', 'Initialization'))
                .map(node => node.getAttribute('range'))
                .filter((range): range is string => Boolean(range))
        );
        this.indexRanges = new Set(
            Array.from(document.getElementsByTagNameNS('*', 'SegmentBase'))
                .map(node => node.getAttribute('indexRange'))
                .filter((range): range is string => Boolean(range))
        );
        return URL.createObjectURL(new Blob([decodedBytes ?? contents], { type: 'application/dash+xml' }));
    }

    private bindMediaEvents(element: HTMLMediaElement): void {
        element.addEventListener('timeupdate', () => {
            const duration = element.duration;
            this.emit('playbackTimeUpdated', {
                timeToEnd: Number.isFinite(duration) ? Math.max(0, duration - element.currentTime) : undefined
            });
        });
        element.addEventListener('loadedmetadata', () => this.emit('playbackMetadataLoaded'));
        element.addEventListener('playing', () => this.emit('playbackStarted'));
        element.addEventListener('ended', () => this.emit('playbackEnded'));
        element.addEventListener('volumechange', () => this.emit('playbackVolumeChanged'));
    }

    private bindShakaEvents(player: ShakaPlayerInstance): void {
        player.addEventListener('manifestparsed', () => {
            this.emit('manifestLoaded');
            this.emit('streamInitializing');
        });
        // Shaka fires this after manifest filtering, immediately before it picks
        // streams and starts creating segment indexes.
        player.addEventListener('streaming', () => this.emit('shakaStreaming'));
        player.addEventListener('segmentappended', event => {
            const contentType = (event as CustomEvent<{ contentType?: string }>).detail?.contentType
                ?? (event as Event & { contentType?: string }).contentType;
            if (!contentType || contentType === 'audio') this.emit('segmentAppended');
        });
    }

    private bindNetworkEvents(player: ShakaPlayerInstance): void {
        const networkingEngine = player.getNetworkingEngine();
        if (!networkingEngine) return;
        const { RequestType, AdvancedRequestType } = shakaApi.net.NetworkingEngine;
        const requestRange = (request?: ShakaRequest) => {
            const header = Object.entries(request?.headers ?? {})
                .find(([name]) => name.toLowerCase() === 'range')?.[1];
            return header?.replace(/^bytes=/i, '') ?? null;
        };
        const fragmentKind = (type: number, request?: ShakaRequest, context?: ShakaRequestContext) => {
            if (type !== RequestType.SEGMENT) return null;
            const range = requestRange(request);
            if (range && this.indexRanges.has(range)) return 'IndexSegment';
            if (range && this.initializationRanges.has(range)) return 'InitializationSegment';
            if (context?.type === AdvancedRequestType.INIT_SEGMENT) return 'InitializationSegment';
            if (context?.type === AdvancedRequestType.MEDIA_SEGMENT) return 'MediaSegment';
            return null;
        };
        networkingEngine.registerRequestFilter((type, request, context) => {
            const requestType = fragmentKind(type, request, context);
            if (requestType) {
                this.emit('fragmentLoadingStarted', {
                    request: { type: requestType, url: request.uris[0], range: requestRange(request) }
                });
            }
        });
        networkingEngine.registerResponseFilter((type, response, context) => {
            const request = response.originalRequest;
            const requestType = fragmentKind(type, request, context);
            if (requestType) {
                this.emit('fragmentLoadingCompleted', {
                    request: { type: requestType, url: request?.uris[0], range: requestRange(request) }
                });
            }
        });
    }

    private emitSabrTiming(event: SabrTimingEvent): void {
        const range = event.range?.replace(/^bytes=/i, '');
        const kind = range && this.indexRanges.has(range) ? 'index'
            : range && this.initializationRanges.has(range) ? 'init'
                : event.hasSegment ? 'media'
                    : null;
        if (kind) this.emit('sabrTiming', { ...event, range, kind });
    }
}

export const MediaPlayer = Object.assign(
    () => ({ create: () => new MediaPlayerClass() }),
    { events: PLAYER_EVENTS }
);
