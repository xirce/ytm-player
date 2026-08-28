import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errors';
import { getRequiredParam } from '../middleware/validation';

const router = Router();

router.get('/:id', asyncHandler(async (req, _res) => {
    getRequiredParam(req, 'id');
    throw new HttpError(501, 'Radio endpoint is not implemented');
}));

export default router;
