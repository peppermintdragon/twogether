import { Router } from 'express';
import * as mood from '../controllers/mood.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { setMoodSchema } from '../validators/mood.validator.js';

const router = Router();

router.use(authenticate, requireCouple);

router.get('/today', asyncHandler(mood.getTodayMoods));
router.get('/calendar', asyncHandler(mood.getMoodCalendar));
router.get('/insights', asyncHandler(mood.getMoodInsights));
router.post('/', validate(setMoodSchema), asyncHandler(mood.setMood));

export default router;
