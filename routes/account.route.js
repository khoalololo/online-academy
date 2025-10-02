import express from 'express';
import bcrypt from 'bcryptjs';
import userModel from '../models/user.model.js';
import authMdw from '../middlewares/auth.mdw.js';

const router = express.Router();

// [GET] /account/signin
router.get('/signin', (req, res) => {
  res.render('vwAccount/signin', { layout: 'main' });
});

// [POST] /account/signin
router.post('/signin', async (req, res) => {
  const { username, password } = req.body;
  const user = await userModel.findByUsername(username);

  if (!user) {
    return res.render('vwAccount/signin', {
      error_message: 'Invalid username or password.'
    });
  }

  const isPasswordValid = await userModel.verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    return res.render('vwAccount/signin', {
      error_message: 'Invalid username or password.'
    });
  }

  req.session.isAuthenticated = true;
  req.session.authUser = user;

  const url = req.session.retUrl || '/';
  delete req.session.retUrl;
  res.redirect(url);
});

// [GET] /account/signup
router.get('/signup', (req, res) => {
  res.render('vwAccount/signup', { 
    layout: 'main',
    title: 'Sign Up - Online Academy'
  });
});

// [POST] /account/signup
router.post('/signup', async (req, res) => {
    try {
        if (req.body.password !== req.body.confirmPassword) {
             return res.render('vwAccount/signup', { error_message: 'Passwords do not match.' });
        }
        if (await userModel.emailExists(req.body.email)) {
            return res.render('vwAccount/signup', { error_message: 'Email already exists.' });
        }

        // The username check is now primarily on the client, but we keep a server-side check as a fallback.
        if (await userModel.usernameExists(req.body.username)) {
            return res.render('vwAccount/signup', { error_message: 'Username already exists.' });
        }

        await userModel.create(req.body);
        res.render('vwAccount/signin', { success_message: 'Registration successful! Please sign in.'});
    } catch (error) {
        console.error(error);
        res.render('vwAccount/signup', { error_message: 'An error occurred during registration.' });
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