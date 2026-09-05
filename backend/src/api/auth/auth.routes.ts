import { Router } from 'express';
import { authenticate } from '@/middlewares/auth';
import { loginLimiter, otpRequestLimiter, otpVerifyLimiter } from '@/middlewares/rateLimiter';
import { validate } from '@/middlewares/validate';
import {
  changePasswordHandler,
  confirmPasswordResetHandler,
  googleLogin,
  logoutHandler,
  me,
  passwordLogin,
  refresh,
  register,
  requestOtp,
  requestPasswordResetHandler,
  verifyOtp,
} from './auth.controller';
import {
  changePasswordSchema,
  confirmPasswordResetSchema,
  googleTokenSchema,
  registerCustomerSchema,
  requestOtpSchema,
  requestPasswordResetSchema,
  staffAdminLoginSchema,
  verifyOtpSchema,
} from './auth.validator';

const router = Router();

router.post('/otp/request', otpRequestLimiter, validate(requestOtpSchema), requestOtp);
router.post('/otp/verify', otpVerifyLimiter, validate(verifyOtpSchema), verifyOtp);

router.post('/login', loginLimiter, validate(staffAdminLoginSchema), passwordLogin);
router.post('/register', loginLimiter, validate(registerCustomerSchema), register);
router.post('/google', loginLimiter, validate(googleTokenSchema), googleLogin);

router.post(
  '/password-reset/request',
  otpRequestLimiter,
  validate(requestPasswordResetSchema),
  requestPasswordResetHandler
);
router.post(
  '/password-reset/confirm',
  otpVerifyLimiter,
  validate(confirmPasswordResetSchema),
  confirmPasswordResetHandler
);

router.post(
  '/change-password',
  authenticate,
  loginLimiter,
  validate(changePasswordSchema),
  changePasswordHandler
);

router.post('/refresh', refresh);
router.post('/logout', logoutHandler);
router.get('/me', authenticate, me);

export default router;
