const validator = require('validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Create DOMPurify instance
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Sanitize HTML content to prevent XSS
const sanitizeHtml = (html) => {
  if (!html) return '';
  return DOMPurify.sanitize(html, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  });
};

// Sanitize text input
const sanitizeText = (text) => {
  if (!text) return '';
  return validator.escape(text.toString().trim());
};

// Validate and sanitize user registration data
const validateUserRegistration = (req, res, next) => {
  const errors = [];
  
  // Sanitize inputs
  req.body.username = sanitizeText(req.body.username);
  req.body.email = sanitizeText(req.body.email);
  req.body.firstName = sanitizeText(req.body.firstName);
  req.body.lastName = sanitizeText(req.body.lastName);
  req.body.role = sanitizeText(req.body.role);
  
  // Validate username
  if (!req.body.username || req.body.username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  if (req.body.username.length > 50) {
    errors.push('Username must not exceed 50 characters');
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(req.body.username)) {
    errors.push('Username can only contain letters, numbers, dots, underscores, and hyphens');
  }
  
  // Validate email
  if (!req.body.email || !validator.isEmail(req.body.email)) {
    errors.push('Valid email address is required');
  }
  
  // Validate password
  if (!req.body.password || req.body.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  if (req.body.password.length > 100) {
    errors.push('Password must not exceed 100 characters');
  }
  
  // Validate first name
  if (!req.body.firstName || req.body.firstName.length < 1) {
    errors.push('First name is required');
  }
  if (req.body.firstName.length > 100) {
    errors.push('First name must not exceed 100 characters');
  }
  
  // Validate last name
  if (!req.body.lastName || req.body.lastName.length < 1) {
    errors.push('Last name is required');
  }
  if (req.body.lastName.length > 100) {
    errors.push('Last name must not exceed 100 characters');
  }
  
  // Validate role
  const allowedRoles = ['employee', 'coordinator', 'administrator'];
  if (!req.body.role || !allowedRoles.includes(req.body.role)) {
    errors.push('Valid role is required (employee, coordinator, administrator)');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

// Validate and sanitize login data
const validateLogin = (req, res, next) => {
  const errors = [];
  
  // Sanitize inputs
  req.body.username = sanitizeText(req.body.username);
  
  // Validate username
  if (!req.body.username) {
    errors.push('Username is required');
  }
  
  // Validate password
  if (!req.body.password) {
    errors.push('Password is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

// Validate and sanitize report data
const validateReport = (req, res, next) => {
  const errors = [];
  
  // Sanitize text inputs
  req.body.objectName = sanitizeText(req.body.objectName);
  req.body.workPerformed = sanitizeText(req.body.workPerformed);
  req.body.notesProblems = sanitizeText(req.body.notesProblems);
  
  // Validate report date
  if (!req.body.reportDate) {
    errors.push('Report date is required');
  } else if (!validator.isDate(req.body.reportDate)) {
    errors.push('Valid report date is required (YYYY-MM-DD format)');
  }
  
  // Validate object name
  if (!req.body.objectName || req.body.objectName.length === 0) {
    errors.push('Object name is required');
  }
  if (req.body.objectName.length > 300) {
    errors.push('Object name must not exceed 300 characters');
  }
  
  // Validate work performed
  if (!req.body.workPerformed || req.body.workPerformed.length === 0) {
    errors.push('Work performed description is required');
  }
  if (req.body.workPerformed.length > 300) {
    errors.push('Work performed description must not exceed 300 characters');
  }
  
  // Validate notes/problems (optional but with limit)
  if (req.body.notesProblems && req.body.notesProblems.length > 300) {
    errors.push('Notes/problems must not exceed 300 characters');
  }
  
  // Validate employees array
  if (!req.body.employees || !Array.isArray(req.body.employees)) {
    errors.push('Employees array is required');
  } else {
    req.body.employees.forEach((emp, index) => {
      if (!emp.employeeId) {
        errors.push(`Employee ${index + 1}: Employee ID is required`);
      }
      if (!emp.startTime || !validator.matches(emp.startTime, /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        errors.push(`Employee ${index + 1}: Valid start time is required (HH:MM format)`);
      }
      if (!emp.endTime || !validator.matches(emp.endTime, /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        errors.push(`Employee ${index + 1}: Valid end time is required (HH:MM format)`);
      }
      
      // Validate that end time is after start time
      if (emp.startTime && emp.endTime) {
        const start = new Date(`2000-01-01T${emp.startTime}:00`);
        const end = new Date(`2000-01-01T${emp.endTime}:00`);
        if (end <= start) {
          errors.push(`Employee ${index + 1}: End time must be after start time`);
        }
      }
    });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

// Validate and sanitize employee data
const validateEmployee = (req, res, next) => {
  const errors = [];
  
  // Sanitize inputs
  req.body.firstName = sanitizeText(req.body.firstName);
  req.body.lastName = sanitizeText(req.body.lastName);
  req.body.email = sanitizeText(req.body.email);
  req.body.phone = sanitizeText(req.body.phone);
  req.body.position = sanitizeText(req.body.position);
  
  // Validate first name
  if (!req.body.firstName || req.body.firstName.length === 0) {
    errors.push('First name is required');
  }
  if (req.body.firstName.length > 100) {
    errors.push('First name must not exceed 100 characters');
  }
  
  // Validate last name
  if (!req.body.lastName || req.body.lastName.length === 0) {
    errors.push('Last name is required');
  }
  if (req.body.lastName.length > 100) {
    errors.push('Last name must not exceed 100 characters');
  }
  
  // Validate email (optional)
  if (req.body.email && !validator.isEmail(req.body.email)) {
    errors.push('Valid email address is required');
  }
  
  // Validate phone (optional)
  if (req.body.phone && req.body.phone.length > 20) {
    errors.push('Phone number must not exceed 20 characters');
  }
  
  // Validate position (optional)
  if (req.body.position && req.body.position.length > 100) {
    errors.push('Position must not exceed 100 characters');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

// General request sanitization middleware
const sanitizeRequest = (req, res, next) => {
  // Recursively sanitize all string values in the request body
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return sanitizeText(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };
  
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

module.exports = {
  sanitizeHtml,
  sanitizeText,
  validateUserRegistration,
  validateLogin,
  validateReport,
  validateEmployee,
  sanitizeRequest
};