import express from 'express';
import { AccountController } from '../controllers/account.controller.js';
import {
  validateSignup,
  validateSignin,
  validateProfileUpdate,
  validateChangePassword,
  handleValidationErrors,
} from '../validations/account.validation.js';
import authMdw from '../middlewares/auth.mdw.js';

const router = express.Router();

router.get('/signin', AccountController.getSignin);

router.post('/signin', validateSignin, handleValidationErrors, AccountController.postSignin);

router.get('/signup', AccountController.getSignup);

router.post('/signup', validateSignup, handleValidationErrors, AccountController.postSignup);

router.get('/verify-otp', AccountController.getVerifyOtp);

router.post('/verify-otp', AccountController.postVerifyOtp);

router.get('/is-available', AccountController.checkAvailability);

router.get('/logout', AccountController.getLogout);

router.get('/profile', authMdw.isAuthenticated, AccountController.getProfile);

router.post(
  '/profile',
  authMdw.isAuthenticated,
  validateProfileUpdate,
  handleValidationErrors,
  AccountController.postProfile
);

router.post(
  '/change-password',
  authMdw.isAuthenticated,
  validateChangePassword,
  handleValidationErrors,
  AccountController.postChangePassword
);

export default router;
