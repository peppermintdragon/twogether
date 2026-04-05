import { Router } from 'express';
import * as bucket from '../controllers/bucketList.controller.js';
import { authenticate, requireCouple } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createBucketItemSchema, updateBucketItemSchema } from '../validators/bucketList.validator.js';

const router = Router();

router.use(authenticate, requireCouple);

router.get('/', asyncHandler(bucket.getBucketList));
router.post('/', validate(createBucketItemSchema), asyncHandler(bucket.createBucketItem));
router.put('/:id', validate(updateBucketItemSchema), asyncHandler(bucket.updateBucketItem));
router.patch('/:id/toggle', asyncHandler(bucket.toggleBucketItem));
router.delete('/:id', asyncHandler(bucket.deleteBucketItem));

export default router;
