import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { logger } from '../utils/logger';

export class HttpError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = 'HttpError';
    }
}

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (handler: AsyncRequestHandler): RequestHandler =>
    (req, res, next) => void handler(req, res, next).catch(next);

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : 'Internal server error';

    if (status >= 500) logger.error(error);
    res.status(status).json({ error: message });
};
