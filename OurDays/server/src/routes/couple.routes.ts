import { Router } from 'express';
import * as couple from '../controllers/couple.controller.js';
import { disconnectCouple } from '../controllers/auth.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, requireCouple);

router.get('/', asyncHandler(couple.getCoupleProfile));
router.put('/', asyncHandler(couple.updateCoupleProfile));
router.get('/stats', asyncHandler(couple.getCoupleStats));
router.post('/cover-photo', upload.single('photo'), asyncHandler(couple.uploadCoverPhoto));
router.delete('/disconnect', asyncHandler(disconnectCouple));

export default router;
