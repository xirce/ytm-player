import { createHash, randomBytes } from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { database, AppUser } from './database';

const config = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const appBaseUrl = process.env.APP_BASE_URL?.trim() || 'http://localhost:3000';
    if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    return { clientId, clientSecret, redirectUri: `${appBaseUrl}/api/auth/google/callback` };
};

const base64UrlHash = (value: string): string =>
    createHash('sha256').update(value).digest('base64url');

export const startGoogleAuthentication = async (): Promise<string> => {
    const { clientId, clientSecret, redirectUri } = config();
    const client = new OAuth2Client(clientId, clientSecret, redirectUri);
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(64).toString('base64url');
    await database.saveOAuthState(state, nonce, codeVerifier, new Date(Date.now() + 10 * 60 * 1000));
    return client.generateAuthUrl({
        access_type: 'online',
        scope: ['openid', 'email', 'profile'],
        prompt: 'select_account',
        state,
        code_challenge: base64UrlHash(codeVerifier),
        code_challenge_method: CodeChallengeMethod.S256,
        nonce
    });
};

export const finishGoogleAuthentication = async (code: string, state: string): Promise<AppUser> => {
    const pending = await database.consumeOAuthState(state);
    if (!pending) throw new Error('Invalid or expired OAuth state');
    const { clientId, clientSecret, redirectUri } = config();
    const client = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await client.getToken({ code, codeVerifier: pending.codeVerifier, redirect_uri: redirectUri });
    if (!tokens.id_token) throw new Error('Google did not return an ID token');
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== pending.nonce) {
        throw new Error('Google identity could not be verified');
    }
    return database.upsertUser({
        googleSub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        pictureUrl: payload.picture
    });
};
