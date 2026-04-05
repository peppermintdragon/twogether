import { Router } from 'express';
import * as settings from '../controllers/settings.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/preferences', asyncHandler(settings.getPreferences));
router.put('/preferences', asyncHandler(settings.updatePreferences));
router.get('/export', requireCouple, asyncHandler(settings.exportData));

export default router;
