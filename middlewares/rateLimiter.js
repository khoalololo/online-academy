import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).render('vwAccount/signin', {
      error_message: 'Too many failed login attempts. Account temporarily locked.',
    });
  },
});

// OTP verification rate limiter
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes (matches your OTP expiry)
  max: 5, // 5 guesses allowed
  message: 'Too many OTP verification attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Tie the rate limit to the specific registration session rather than just IP
    return req.session?.pendingSignup?.email || ipKeyGenerator(req, res);
  },
  handler: (req, res) => {
    res.status(429).render('vwAccount/verify-otp', { error_message: 'Too many failed attempts. Please request a new code or try again later.' });
  },
});