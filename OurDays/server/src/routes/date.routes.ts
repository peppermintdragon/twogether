import { Router } from 'express';
import * as dateCtrl from '../controllers/date.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createSpecialDateSchema, updateSpecialDateSchema } from '../validators/date.validator.js';

const router = Router();

router.use(authenticate, requireCouple);

router.get('/', asyncHandler(dateCtrl.getSpecialDates));
router.get('/milestones', asyncHandler(dateCtrl.getMilestones));
router.post('/', validate(createSpecialDateSchema), asyncHandler(dateCtrl.createSpecialDate));
router.put('/:id', validate(updateSpecialDateSchema), asyncHandler(dateCtrl.updateSpecialDate));
router.delete('/:id', asyncHandler(dateCtrl.deleteSpecialDate));

export default router;
