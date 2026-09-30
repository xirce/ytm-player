import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { database, AppUser } from '../utils/database';
import { HttpError } from './errors';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const appBaseUrl = (): URL => new URL(process.env.APP_BASE_URL?.trim() || 'http://localhost:3000');
const sessionCookieName = (): string => appBaseUrl().protocol === 'https:' ? '__Host-ytm_session' : 'ytm_session';

const parseCookies = (header?: string): Record<string, string> => Object.fromEntries(
    (header ?? '').split(';').map(value => value.trim()).filter(Boolean).map(value => {
        const separator = value.indexOf('=');
        return separator < 0
            ? [decodeURIComponent(value), '']
            : [decodeURIComponent(value.slice(0, separator)), decodeURIComponent(value.slice(separator + 1))];
    })
);

export const getSessionToken = (req: Request): string | undefined =>
    parseCookies(req.headers.cookie)[sessionCookieName()];

const serializeSessionCookie = (value: string, maxAgeSeconds: number): string => {
    const secure = appBaseUrl().protocol === 'https:' ? '; Secure' : '';
    return `${sessionCookieName()}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
};

export const setSessionCookie = (res: Response, token: string): void => {
    res.setHeader('Set-Cookie', serializeSessionCookie(token, SESSION_TTL_MS / 1000));
};

export const clearSessionCookie = (res: Response): void => {
    res.setHeader('Set-Cookie', serializeSessionCookie('', 0));
};

export const createAppSession = async (userId: string): Promise<string> => {
    const token = randomBytes(32).toString('base64url');
    await database.createSession(token, userId, new Date(Date.now() + SESSION_TTL_MS));
    return token;
};

export const attachUser: RequestHandler = async (req, _res, next) => {
    try {
        const token = getSessionToken(req);
        req.user = token ? await database.getUserBySession(token) ?? undefined : undefined;
        next();
    } catch (error) {
        next(error);
    }
};

export const requireUser = (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new HttpError(401, 'Authentication is required');
    next();
};

export const requireSameOrigin = (req: Request, _res: Response, next: NextFunction): void => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        next();
        return;
    }
    const origin = req.get('origin');
    if (!origin || origin !== appBaseUrl().origin) throw new HttpError(403, 'Invalid request origin');
    next();
};

declare global {
    namespace Express {
        interface Request {
            user?: AppUser;
        }
    }
}

