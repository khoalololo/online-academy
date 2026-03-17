import userRepository from '../repositories/user.repository.js';
import { sendMail } from '../ultis/emailService.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const AccountService = {
  async authenticateUser(username, password) {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid username or password.');
    }
    if (!user.is_verified) {
      throw new Error('Please verify your email before logging in.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password.');
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

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
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

    return {
      username,
      email,
      name,
      password,
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

    return await userRepository.create({
      username: pendingSignup.username,
      password: pendingSignup.password,
      name: pendingSignup.name,
      email: pendingSignup.email,
      dob: pendingSignup.dob,
      is_verified: true,
      otp_code: null,
      otp_expires_at: null,
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
