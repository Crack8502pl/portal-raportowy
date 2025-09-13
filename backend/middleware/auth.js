const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { jwt: jwtConfig, permissions } = require('../config/auth');

// Verify JWT token and extract user information
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'MISSING_TOKEN' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // Get user from database to ensure they still exist and are active
    const userResult = await query(
      'SELECT id, username, email, role, first_name, last_name, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'User account is deactivated',
        code: 'ACCOUNT_DEACTIVATED' 
      });
    }

    // Add user information to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED' 
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN' 
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR' 
    });
  }
};

// Check if user has required role
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

// Check if user has specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED' 
      });
    }

    const userPermissions = permissions[req.user.role] || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        available: userPermissions
      });
    }

    next();
  };
};

// Check if user can access specific resource (for reports)
const requireResourceAccess = async (req, res, next) => {
  try {
    const { id: reportId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Administrators and coordinators can access all reports
    if (userRole === 'administrator' || userRole === 'coordinator') {
      return next();
    }

    // Employees can only access their own reports
    if (userRole === 'employee') {
      const reportResult = await query(
        'SELECT author_id FROM reports WHERE id = $1',
        [reportId]
      );

      if (reportResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Report not found',
          code: 'REPORT_NOT_FOUND' 
        });
      }

      if (reportResult.rows[0].author_id !== userId) {
        return res.status(403).json({ 
          error: 'Access denied - you can only access your own reports',
          code: 'ACCESS_DENIED' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Resource access check error:', error);
    return res.status(500).json({ 
      error: 'Access validation failed',
      code: 'ACCESS_CHECK_ERROR' 
    });
  }
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, jwtConfig.secret);
    const userResult = await query(
      'SELECT id, username, email, role, first_name, last_name, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
      req.user = userResult.rows[0];
    }

    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  requireResourceAccess,
  optionalAuth
};