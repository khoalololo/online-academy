import { AccountService } from '../services/account.service.js';

export const AccountController = {
  getSignin(req, res) {
    res.render('vwAccount/signin', { layout: 'main' });
  },

  async postSignin(req, res) {
    try {
      const { username, password } = req.body;
      const user = await AccountService.authenticateUser(username, password);

      req.session.isAuthenticated = true;
      req.session.authUser = user;

      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.render('vwAccount/signin', {
            error_message: 'Login error. Please try again.',
          });
        }
        const redirectUrl = req.session.retUrl || '/';
        delete req.session.retUrl;
        res.redirect(redirectUrl);
      });
    } catch (error) {
      console.error(error);
      res.render('vwAccount/signin', { error_message: error.message });
    }
  },

  getSignup(req, res) {
    res.render('vwAccount/signup');
  },

  async postSignup(req, res) {
    try {
      if (req.validationErrors) {
        return res.render('vwAccount/signup', {
          error_message: req.validationErrors[0].msg,
          formData: req.body,
        });
      }

      const pendingSignup = await AccountService.handleSignup(req.body);
      req.session.pendingSignup = pendingSignup;

      res.redirect('/account/verify-otp');
    } catch (error) {
      console.error('Signup error:', error);
      res.render('vwAccount/signup', {
        error_message: error.message,
        formData: req.body,
      });
    }
  },

  getVerifyOtp(req, res) {
    if (!req.session.pendingSignup) {
      return res.redirect('/account/signup');
    }
    res.render('vwAccount/verify-otp');
  },

  async postVerifyOtp(req, res) {
    try {
      const { otp } = req.body;
      await AccountService.verifyOtpAndCreateUser(otp, req.session.pendingSignup);

      delete req.session.pendingSignup;
      res.render('vwAccount/signin', { success_message: 'Account verified! Please sign in.' });
    } catch (error) {
      console.error(error);

      res.render('vwAccount/verify-otp', { error_message: error.message });
    }
  },

  async checkAvailability(req, res) {
    const { username } = req.query;
    const isAvailable = await AccountService.checkAvailability(username);
    res.json({ isAvailable });
  },

  getLogout(req, res) {
    req.session.destroy((err) => {
      if (err) return res.redirect('/');
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  },

  getProfile(req, res) {
    res.render('vwAccount/profile', {
      user: req.session.authUser,
    });
  },

  async postProfile(req, res) {
    try {
      if (req.validationErrors) {
        return res.render('vwAccount/profile', {
          user: req.session.authUser,
          error_message: req.validationErrors[0].msg,
        });
      }

      const userId = req.session.authUser.id;
      const updatedUser = await AccountService.updateProfile(userId, req.body);

      req.session.authUser = updatedUser;

      res.render('vwAccount/profile', {
        user: req.session.authUser,
        success_message: 'Profile updated successfully!',
      });
    } catch (error) {
      console.error(error);
      res.render('vwAccount/profile', {
        user: req.session.authUser,
        error_message: 'Failed to update profile.',
      });
    }
  },

  async postChangePassword(req, res) {
    try {
      if (req.validationErrors) {
        return res.render('vwAccount/profile', {
          user: req.session.authUser,
          error_message: req.validationErrors[0].msg,
        });
      }

      const userId = req.session.authUser.id;
      const { oldPassword, newPassword } = req.body;

      await AccountService.changePassword(userId, oldPassword, newPassword);

      res.render('vwAccount/profile', {
        user: req.session.authUser,
        success_message: 'Password changed successfully!',
      });
    } catch (error) {
      console.error(error);
      res.render('vwAccount/profile', {
        user: req.session.authUser,
        error_message: error.message || 'Failed to change password.',
      });
    }
  },
};
