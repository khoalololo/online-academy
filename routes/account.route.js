import express from 'express';
import bcrypt from 'bcryptjs';
import userModel from '../models/user.model.js';
import authMdw from '../middlewares/auth.mdw.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendMail } from '../ultis/emailService.js';

const router = express.Router();

// [GET] /account/signin
router.get('/signin', (req, res) => {
  res.render('vwAccount/signin', { layout: 'main' });
});

// [POST] /account/signin
router.post('/signin', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await userModel.findByUsername(username);
    if (!user) {
      console.log('User not found:', username);
      return res.render('vwAccount/signin', { error_message: 'Invalid username or password.' });
    }
    if (!user.is_verified) {
      return res.render('vwAccount/signin', {
        error_message: 'Please verify your email before logging in.'
      });
    }
    const isPasswordValid = await userModel.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      return res.render('vwAccount/signin', { error_message: 'Invalid username or password.' });
    }
    if (!user.is_verified) {
      return res.render('vwAccount/signin', {
        error_message: 'Please verify your email before logging in.'
      });
    }

    req.session.isAuthenticated = true;
    req.session.authUser = user; // Use the full user object
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
        return res.render('vwAccount/signin', {
          error_message: 'Login error. Please try again.'
        });
      };
    
      const redirectUrl = req.session.retUrl || '/';
      delete req.session.retUrl;

      res.redirect(redirectUrl);
    });
  } catch (error) {
    console.error(error);
    res.render('vwAccount/signin', { error_message: 'An error occurred during sign-in.' });
  }
});

// [GET] /account/signup
router.get('/signup', (req, res) => {
  res.render('vwAccount/signup');
});

// [POST] /account/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, name, dob } = req.body;
    if (password !== confirmPassword)
      return res.render('vwAccount/signup', { error_message: 'Passwords do not match.' });
    if (await userModel.emailExists(email))
      return res.render('vwAccount/signup', { error_message: 'Email already exists.' });
    if (await userModel.usernameExists(username))
      return res.render('vwAccount/signup', { error_message: 'Username already exists.' });

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

    req.session.pendingSignup = { 
      username,
      email,
      name,
      password,
      dob,
      otpCode,
      otpExpiresAt: otpExpiresAt.toISOString()
    };

    res.redirect('/account/verify-otp');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('vwAccount/signup', { error_message: 'Failed to send verification code. Please try again.',
      formData: req.body
     });
  }
});


router.get("/verify-otp", (req, res) => {
  if (!req.session.pendingSignup) {
    return res.redirect("/account/signup");
  }
  res.render("vwAccount/verify-otp");
});

router.post("/verify-otp", async (req, res) => {
  const { otp } = req.body;
  try {
    const pendingSignup = req.session.pendingSignup;
    if (!pendingSignup) {
      return res.redirect("/account/signup");
    }
    if (pendingSignup.otpCode !== otp) {
      return res.render("vwAccount/verify-otp", { error_message: "Invalid OTP code. Please try again." });
    }
    if (new Date() > new Date(pendingSignup.otpExpiresAt)) {
      return res.render("vwAccount/verify-otp", { error_message: "OTP code has expired. Please sign up again." });
    }

    await userModel.create({
      username: pendingSignup.username,
      password: pendingSignup.password,
      name: pendingSignup.name,
      email: pendingSignup.email,
      dob: pendingSignup.dob,
      is_verified: true,
      otp_code: null,
      otp_expires_at: null
    });


    delete req.session.pendingSignup;
    res.render("vwAccount/signin", { success_message: "Account verified! Please sign in." });
  } catch (error) {
    console.error(error);
    res.render("vwAccount/verify-otp", { error_message: "An error occurred during verification." });
  }
});


// [GET] /account/is-available - For client-side validation
router.get('/is-available', async (req, res) => {
    const { username } = req.query;
    const exists = await userModel.usernameExists(username);
    res.json({ isAvailable: !exists });
});

// [GET] /account/logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// [GET] /account/profile
router.get('/profile', authMdw.isAuthenticated, (req, res) => {
    res.render('vwAccount/profile', {
        user: req.session.authUser
    });
});

// [POST] /account/profile
router.post('/profile', authMdw.isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.authUser.id;
        await userModel.updateProfile(userId, req.body);
        
        req.session.authUser = await userModel.findById(userId); // Refresh session data

        res.render('vwAccount/profile', { 
            user: req.session.authUser,
            success_message: 'Profile updated successfully!'
        });
    } catch (error) {
        console.error(error);
        res.render('vwAccount/profile', { 
            user: req.session.authUser,
            error_message: 'Failed to update profile.'
        });
    }
});

// [POST] /account/change-password
router.post('/change-password', authMdw.isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.authUser.id;
        const { oldPassword, newPassword } = req.body;

        await userModel.changePassword(userId, oldPassword, newPassword);

         res.render('vwAccount/profile', { 
            user: req.session.authUser,
            success_message: 'Password changed successfully!'
        });

    } catch (error) {
        console.error(error);
        res.render('vwAccount/profile', { 
            user: req.session.authUser,
            error_message: error.message || 'Failed to change password.'
        });
    }
});

export default router;