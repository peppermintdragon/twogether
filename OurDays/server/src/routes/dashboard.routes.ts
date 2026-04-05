import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', authenticate, requireCouple, asyncHandler(getDashboard));

export default router;
