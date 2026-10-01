import axios from 'axios';

export interface TokenProvider {
    getToken(contentBinding: string): Promise<string>;
}

interface PoTokenResponse {
    poToken?: unknown;
    contentBinding?: unknown;
    expiresAt?: unknown;
}

interface CachedToken {
    token: string;
    expiresAt: number;
}

export class HttpTokenProvider implements TokenProvider {
    private readonly endpoint: URL;
    private readonly cache = new Map<string, CachedToken>();
    private readonly pending = new Map<string, Promise<string>>();

    public constructor(baseUrl: string) {
        this.endpoint = new URL('/get_pot', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    }

    public async getToken(contentBinding: string): Promise<string> {
        const cached = this.cache.get(contentBinding);
        if (cached && cached.expiresAt > Date.now() + 60_000) {
            return cached.token;
        }

        const existingRequest = this.pending.get(contentBinding);
        if (existingRequest) return existingRequest;

        const request = this.fetchToken(contentBinding).finally(() => {
            this.pending.delete(contentBinding);
        });
        this.pending.set(contentBinding, request);
        return request;
    }

    private async fetchToken(contentBinding: string): Promise<string> {
        let data: PoTokenResponse;
        try {
            const response = await axios.post<PoTokenResponse>(
                this.endpoint.toString(),
                { content_binding: contentBinding },
                { timeout: 30_000 }
            );
            data = response.data;
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? `${error.response?.status ?? error.code ?? 'request failed'}: ${
                    typeof error.response?.data?.error === 'string'
                        ? error.response.data.error
                        : error.message
                }`
                : (error as Error).message;
            throw new Error(`PO token provider failed for video ${contentBinding}: ${message}`);
        }

        if (typeof data.poToken !== 'string' || !data.poToken) {
            throw new Error('PO token provider returned an invalid response');
        }
        if (data.contentBinding !== contentBinding) {
            throw new Error('PO token provider returned a token for another content binding');
        }

        const expiresAt = typeof data.expiresAt === 'string'
            ? Date.parse(data.expiresAt)
            : Number.NaN;
        this.cache.set(contentBinding, {
            token: data.poToken,
            expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 5 * 60_000
        });
        return data.poToken;
    }
}
