import { body, query, validationResult } from 'express-validator';

export const validateSignup = [
  body('username')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be at least 8 characters long'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  body('name').isString().trim().notEmpty().withMessage('Name is required'),
  body('dob').isDate({ format: 'YYYY-MM-DD' }).withMessage('Valid date of birth is required'),
];

export const validateSignin = [
  body('username').isString().trim().notEmpty().withMessage('Username is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

export const validateProfileUpdate = [
  body('name').optional().isString().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('dob').optional().isDate({ format: 'YYYY-MM-DD' }).withMessage('Valid date is required'),
  body('bio').optional().isString().trim()
];

export const validateChangePassword = [
  body('oldPassword').isString().notEmpty().withMessage('Old password is required'),
  body('newPassword').isLength({ min: 8, max: 72 }).withMessage('New password must be at least 8 characters long')
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If it's an AJAX request, return JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // Otherwise, attach errors to req for rendering in the next handler or render directly
    // This part requires coordination with your views. For now, we can pass it to res.locals.
    req.validationErrors = errors.array();
  }
  next();
};
