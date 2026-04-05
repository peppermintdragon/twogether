import { Router } from 'express';
import * as note from '../controllers/note.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendNoteSchema } from '../validators/note.validator.js';

const router = Router();

router.use(authenticate, requireCouple);

router.get('/', asyncHandler(note.getNotes));
router.get('/streak', asyncHandler(note.getNoteStreak));
router.post('/', validate(sendNoteSchema), asyncHandler(note.sendNote));
router.put('/:id/read', asyncHandler(note.markNoteRead));
router.delete('/:id', asyncHandler(note.deleteNote));

export default router;
