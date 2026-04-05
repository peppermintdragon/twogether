import { Router } from 'express';
import * as ping from '../controllers/ping.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, requireCouple);

router.post('/', asyncHandler(ping.sendPing));
router.get('/recent', asyncHandler(ping.getRecentPings));

export default router;
