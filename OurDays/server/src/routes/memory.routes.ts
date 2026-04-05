import { Router } from 'express';
import * as memory from '../controllers/memory.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createMemorySchema, updateMemorySchema } from '../validators/memory.validator.js';

const router = Router();

router.use(authenticate, requireCouple);

router.get('/', asyncHandler(memory.getMemories));
router.get('/on-this-day', asyncHandler(memory.getOnThisDay));
router.get('/:id', asyncHandler(memory.getMemory));
router.post('/', upload.array('photos', 10), asyncHandler(memory.createMemory));
router.put('/:id', validate(updateMemorySchema), asyncHandler(memory.updateMemory));
router.delete('/:id', asyncHandler(memory.deleteMemory));

export default router;
