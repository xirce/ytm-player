import type { Request } from 'express';
import { HttpError } from './errors';

const MAX_QUERY_LENGTH = 200;

export function getRequiredQuery(req: Request, name: string): string {
    const value = req.query[name];
    if (typeof value !== 'string' || !value.trim()) {
        throw new HttpError(400, `Query parameter "${name}" is required`);
    }
    if (value.length > MAX_QUERY_LENGTH) {
        throw new HttpError(400, `Query parameter "${name}" is too long`);
    }
    return value.trim();
}

export function getRequiredParam(req: Request, name: string): string {
    const value = req.params[name];
    if (typeof value !== 'string' || !value.trim()) {
        throw new HttpError(400, `Path parameter "${name}" is required`);
    }
    return value.trim();
}
