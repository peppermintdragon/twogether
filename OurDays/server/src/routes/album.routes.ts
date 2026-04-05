import { Router } from 'express';
import * as memory from '../controllers/memory.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAlbumSchema } from '../validators/memory.validator.js';

const router = Router();

router.use(authenticate, requireCouple);

router.get('/', asyncHandler(memory.getAlbums));
router.post('/', validate(createAlbumSchema), asyncHandler(memory.createAlbum));
router.delete('/:id', asyncHandler(memory.deleteAlbum));

export default router;
