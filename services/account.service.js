import userRepository from '../repositories/user.repository.js';
import { sendMail } from '../ultis/emailService.js';
import bcrypt from 'bcryptjs';
import db from '../ultis/db.js';
import crypto from 'crypto';
const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

export const AccountService = {
  async authenticateUser(username, password) {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid username or password.');
    }
    if (!user.is_verified) {
      throw new Error('Please verify your email before logging in.');
    }

    // 1. Check if account is currently locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new Error('Account temporarily locked due to too many failed attempts. Try again later.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // 2. Handle failed attempt
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updateData = { failed_login_attempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + LOCK_TIME);
      }
      
      await db('users').where('id', user.id).update(updateData);
      throw new Error('Invalid username or password.');
    }

    // 3. Reset failed attempts on successful login
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await db('users').where('id', user.id).update({
        failed_login_attempts: 0,
        locked_until: null
      });
    }

    return user;
  },

  async handleSignup(userData) {
    const { username, email, name, password, dob } = userData;

    if (await userRepository.emailExists(email)) {
      throw new Error('Email already exists.');
    }
    if (await userRepository.usernameExists(username)) {
      throw new Error('Username already exists.');
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await sendMail({
      to: email,
      subject: 'Your Online Academy OTP Verification Code',
      html: `
        <h2>Welcome to Online Academy 🎓</h2>
        <p>Your verification code is:</p>
        <h1 style="color:#4f46e5;">${otpCode}</h1>
        <p>This code will expire in 10 minutes.</p>
      `,
    });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    return {
      username,
      email,
      name,
      password_hash,
      dob,
      otpCode,
      otpExpiresAt: otpExpiresAt.toISOString(),
    };
  },

  async verifyOtpAndCreateUser(otp, pendingSignup) {
    if (!pendingSignup) {
      throw new Error('Session expired. Please sign up again.');
    }
    if (pendingSignup.otpCode !== otp) {
      throw new Error('Invalid OTP code. Please try again.');
    }
    if (new Date() > new Date(pendingSignup.otpExpiresAt)) {
      throw new Error('OTP code has expired. Please sign up again.');
    }

    return await userRepository.createVerified({
      username: pendingSignup.username,
      password_hash: pendingSignup.password_hash,
      name: pendingSignup.name,
      email: pendingSignup.email,
      dob: pendingSignup.dob,
    });
  },

  async checkAvailability(username) {
    const exists = await userRepository.usernameExists(username);
    return !exists;
  },

  async updateProfile(userId, data) {
    return await userRepository.updateProfile(userId, data);
  },

  async changePassword(userId, oldPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const isValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValid) throw new Error('Invalid old password');

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return await userRepository.changePasswordHash(userId, newHash);
  },
};
