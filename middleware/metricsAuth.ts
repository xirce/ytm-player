import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const equal = (actual: string, expected: string): boolean => {
    const left = Buffer.from(actual);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(
        left as unknown as NodeJS.ArrayBufferView,
        right as unknown as NodeJS.ArrayBufferView
    );
};

export const authorizeMetrics: RequestHandler = (req, res, next) => {
    const token = process.env.METRICS_TOKEN?.trim();
    if (!token) {
        if (process.env.NODE_ENV !== 'production') {
            next();
            return;
        }
        res.sendStatus(404);
        return;
    }
    const authorization = req.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ') || !equal(authorization.slice(7), token)) {
        res.setHeader('WWW-Authenticate', 'Bearer');
        res.sendStatus(401);
        return;
    }
    next();
};
