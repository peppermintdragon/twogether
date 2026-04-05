import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authLimiter, strictLimiter } from '../middleware/rateLimiter.middleware.js';
import { avatarUpload } from '../middleware/upload.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  registerSchema, loginSchema, forgotPasswordSchema,
  refreshTokenSchema, onboardingStep1Schema, onboardingStep3Schema,
  changePasswordSchema, updateProfileSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(auth.register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(auth.login));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(auth.refreshTokenHandler));
router.post('/forgot-password', strictLimiter, validate(forgotPasswordSchema), asyncHandler(auth.forgotPassword));

// Authenticated
router.get('/me', authenticate, asyncHandler(auth.getMe));
router.put('/profile', authenticate, validate(updateProfileSchema), asyncHandler(auth.updateProfile));
router.post('/avatar', authenticate, avatarUpload.single('avatar'), asyncHandler(auth.uploadAvatar));
router.post('/logout', authenticate, asyncHandler(auth.logout));
router.put('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(auth.changePassword));
router.delete('/account', authenticate, asyncHandler(auth.deleteAccount));

// Onboarding
router.put('/onboarding/step1', authenticate, validate(onboardingStep1Schema), asyncHandler(auth.onboardingStep1));
router.post('/onboarding/create-couple', authenticate, asyncHandler(auth.createCouple));
router.post('/onboarding/join-couple', authenticate, asyncHandler(auth.joinCouple));
router.put('/onboarding/step3', authenticate, validate(onboardingStep3Schema), asyncHandler(auth.onboardingStep3));
router.post('/onboarding/complete', authenticate, asyncHandler(auth.completeOnboarding));

export default router;
