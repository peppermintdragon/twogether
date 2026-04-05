import { Router } from 'express';
import * as notif from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(notif.getNotifications));
router.put('/:id/read', asyncHandler(notif.markRead));
router.put('/read-all', asyncHandler(notif.markAllRead));

export default router;
