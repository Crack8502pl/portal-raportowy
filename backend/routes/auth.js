const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateLogin, validateUserRegistration } = require('../middleware/validation');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth routes
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/register', authLimiter, requireRole('administrator'), validateUserRegistration, authController.register);
router.post('/logout', generalLimiter, authController.logout);

// Protected routes
router.get('/profile', generalLimiter, authenticateToken, authController.getProfile);
router.put('/profile', generalLimiter, authenticateToken, authController.updateProfile);
router.post('/change-password', authLimiter, authenticateToken, authController.changePassword);
router.post('/refresh-token', generalLimiter, authenticateToken, authController.refreshToken);
router.get('/verify-token', generalLimiter, authenticateToken, authController.verifyToken);

module.exports = router;