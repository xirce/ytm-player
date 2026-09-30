import { createHash, randomUUID } from 'node:crypto';
import { Pool } from 'pg';

export interface AppUser {
    id: string;
    googleSub: string;
    email: string;
    name: string;
    pictureUrl?: string;
}

export interface YouTubeMusicConnectionRecord {
    userId: string;
    cookieCiphertext: string;
    authUser: number;
    pageId?: string;
    language: string;
    status: 'connected' | 'error';
}

let pool: Pool | undefined;
const getPool = (): Pool => {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) throw new Error('DATABASE_URL is required');
    return pool ??= new Pool({ connectionString });
};
const hash = (value: string): string => createHash('sha256').update(value).digest('hex');

const mapUser = (row: Record<string, unknown>): AppUser => ({
    id: String(row.id),
    googleSub: String(row.google_sub),
    email: String(row.email),
    name: String(row.name),
    pictureUrl: row.picture_url ? String(row.picture_url) : undefined
});

export const database = {
    async initialize(): Promise<void> {
        const databasePool = getPool();
        await databasePool.query(`
            CREATE TABLE IF NOT EXISTS app_users (
                id uuid PRIMARY KEY,
                google_sub text UNIQUE NOT NULL,
                email text NOT NULL,
                name text NOT NULL,
                picture_url text,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS app_sessions (
                token_hash text PRIMARY KEY,
                user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                expires_at timestamptz NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS app_sessions_user_id_idx ON app_sessions(user_id);
            CREATE TABLE IF NOT EXISTS oauth_states (
                state_hash text PRIMARY KEY,
                nonce text NOT NULL,
                code_verifier text NOT NULL,
                expires_at timestamptz NOT NULL
            );
            CREATE TABLE IF NOT EXISTS youtube_music_connections (
                user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
                cookie_ciphertext text NOT NULL,
                auth_user integer NOT NULL DEFAULT 0 CHECK (auth_user >= 0),
                page_id text,
                language text NOT NULL DEFAULT 'ru',
                status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'error')),
                validated_at timestamptz NOT NULL,
                updated_at timestamptz NOT NULL DEFAULT now()
            );
        `);
        await databasePool.query('DELETE FROM app_sessions WHERE expires_at <= now()');
        await databasePool.query('DELETE FROM oauth_states WHERE expires_at <= now()');
    },

    async saveOAuthState(state: string, nonce: string, codeVerifier: string, expiresAt: Date): Promise<void> {
        await getPool().query(
            `INSERT INTO oauth_states (state_hash, nonce, code_verifier, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [hash(state), nonce, codeVerifier, expiresAt]
        );
    },

    async consumeOAuthState(state: string): Promise<{ nonce: string; codeVerifier: string } | null> {
        const client = await getPool().connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `DELETE FROM oauth_states
                 WHERE state_hash = $1 AND expires_at > now()
                 RETURNING nonce, code_verifier`,
                [hash(state)]
            );
            await client.query('COMMIT');
            const row = result.rows[0];
            return row ? { nonce: row.nonce, codeVerifier: row.code_verifier } : null;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async upsertUser(input: Omit<AppUser, 'id'>): Promise<AppUser> {
        const result = await getPool().query(
            `INSERT INTO app_users (id, google_sub, email, name, picture_url)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (google_sub) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                picture_url = EXCLUDED.picture_url,
                updated_at = now()
             RETURNING *`,
            [randomUUID(), input.googleSub, input.email, input.name, input.pictureUrl ?? null]
        );
        return mapUser(result.rows[0]);
    },

    async createSession(token: string, userId: string, expiresAt: Date): Promise<void> {
        await getPool().query(
            'INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
            [hash(token), userId, expiresAt]
        );
    },

    async getUserBySession(token: string): Promise<AppUser | null> {
        const result = await getPool().query(
            `SELECT u.* FROM app_sessions s
             JOIN app_users u ON u.id = s.user_id
             WHERE s.token_hash = $1 AND s.expires_at > now()`,
            [hash(token)]
        );
        return result.rows[0] ? mapUser(result.rows[0]) : null;
    },

    async deleteSession(token: string): Promise<void> {
        await getPool().query('DELETE FROM app_sessions WHERE token_hash = $1', [hash(token)]);
    },

    async getMusicConnection(userId: string): Promise<YouTubeMusicConnectionRecord | null> {
        const result = await getPool().query(
            `SELECT user_id, cookie_ciphertext, auth_user, page_id, language, status
             FROM youtube_music_connections WHERE user_id = $1`,
            [userId]
        );
        const row = result.rows[0];
        return row ? {
            userId: row.user_id,
            cookieCiphertext: row.cookie_ciphertext,
            authUser: row.auth_user,
            pageId: row.page_id ?? undefined,
            language: row.language,
            status: row.status
        } : null;
    },

    async saveMusicConnection(record: YouTubeMusicConnectionRecord): Promise<void> {
        await getPool().query(
            `INSERT INTO youtube_music_connections
                (user_id, cookie_ciphertext, auth_user, page_id, language, status, validated_at)
             VALUES ($1, $2, $3, $4, $5, $6, now())
             ON CONFLICT (user_id) DO UPDATE SET
                cookie_ciphertext = EXCLUDED.cookie_ciphertext,
                auth_user = EXCLUDED.auth_user,
                page_id = EXCLUDED.page_id,
                language = EXCLUDED.language,
                status = EXCLUDED.status,
                validated_at = now(),
                updated_at = now()`,
            [record.userId, record.cookieCiphertext, record.authUser, record.pageId ?? null,
                record.language, record.status]
        );
    },

    async deleteMusicConnection(userId: string): Promise<void> {
        await getPool().query('DELETE FROM youtube_music_connections WHERE user_id = $1', [userId]);
    },

    async markMusicConnectionError(userId: string): Promise<void> {
        await getPool().query(
            `UPDATE youtube_music_connections SET status = 'error', updated_at = now() WHERE user_id = $1`,
            [userId]
        );
    }
};
