const express = require('express');
const rateLimit = require('express-rate-limit');
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateUserRegistration } = require('../middleware/validation');

const router = express.Router();

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// All user routes require authentication
router.use(generalLimiter, authenticateToken);

// Get all users (admin only)
router.get('/', requireRole('administrator'), userController.getUsers);

// Get user statistics (admin only)
router.get('/stats', requireRole('administrator'), userController.getUserStats);

// Get specific user (admin/coordinator)
router.get('/:id', requireRole('administrator', 'coordinator'), userController.getUserById);

// Create new user (admin only)
router.post('/', requireRole('administrator'), validateUserRegistration, userController.createUser);

// Update user (admin only)
router.put('/:id', requireRole('administrator'), userController.updateUser);

// Change user password (admin only)
router.post('/:id/change-password', requireRole('administrator'), userController.changeUserPassword);

// Activate user (admin only)
router.post('/:id/activate', requireRole('administrator'), userController.activateUser);

// Deactivate user (admin only)
router.post('/:id/deactivate', requireRole('administrator'), userController.deactivateUser);

// Delete user (admin only) - soft delete
router.delete('/:id', requireRole('administrator'), userController.deleteUser);

module.exports = router;