const express = require('express');
const rateLimit = require('express-rate-limit');
const employeeController = require('../controllers/employeeController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateEmployee } = require('../middleware/validation');

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

// All employee routes require authentication
router.use(generalLimiter, authenticateToken);

// Get all employees
router.get('/', employeeController.getEmployees);

// Get active employees (for report selection)
router.get('/active', employeeController.getActiveEmployees);

// Search employees
router.get('/search', employeeController.searchEmployees);

// Get employee statistics (admin/coordinator)
router.get('/stats', requireRole('administrator', 'coordinator'), employeeController.getEmployeeStats);

// Get specific employee
router.get('/:id', employeeController.getEmployeeById);

// Get employee work history
router.get('/:id/work-history', employeeController.getEmployeeWorkHistory);

// Create new employee (admin/coordinator)
router.post('/', requireRole('administrator', 'coordinator'), validateEmployee, employeeController.createEmployee);

// Update employee (admin/coordinator)
router.put('/:id', requireRole('administrator', 'coordinator'), validateEmployee, employeeController.updateEmployee);

// Activate employee (admin/coordinator)
router.post('/:id/activate', requireRole('administrator', 'coordinator'), employeeController.activateEmployee);

// Deactivate employee (admin/coordinator)
router.post('/:id/deactivate', requireRole('administrator', 'coordinator'), employeeController.deactivateEmployee);

// Delete employee (admin only) - soft delete
router.delete('/:id', requireRole('administrator'), employeeController.deleteEmployee);

module.exports = router;