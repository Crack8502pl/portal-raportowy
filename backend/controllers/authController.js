const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwt: jwtConfig } = require('../config/auth');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    },
    jwtConfig.secret,
    { 
      expiresIn: jwtConfig.expiresIn,
      algorithm: jwtConfig.algorithm 
    }
  );
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    res.json({
      message: 'Login successful',
      user: user.toSafeObject(),
      token,
      expiresIn: jwtConfig.expiresIn
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
};

// Register new user (admin only)
const register = async (req, res) => {
  try {
    const { username, email, password, role, firstName, lastName } = req.body;

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role,
      firstName,
      lastName
    });

    res.status(201).json({
      message: 'User created successfully',
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message === 'Username already exists') {
      return res.status(400).json({
        error: 'Username already exists',
        code: 'USERNAME_EXISTS'
      });
    }
    
    if (error.message === 'Email already exists') {
      return res.status(400).json({
        error: 'Email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    // req.user is set by auth middleware
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR'
    });
  }
};

// Update current user profile
const updateProfile = async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Update user
    const updatedUser = await user.update({
      email,
      firstName,
      lastName
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser.toSafeObject()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.message === 'Email already exists') {
      return res.status(400).json({
        error: 'Email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    await user.changePassword(newPassword);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get fresh user data
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'User not found or deactivated',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new token
    const token = generateToken(user);

    res.json({
      message: 'Token refreshed successfully',
      user: user.toSafeObject(),
      token,
      expiresIn: jwtConfig.expiresIn
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      code: 'REFRESH_TOKEN_ERROR'
    });
  }
};

// Logout (client-side token removal)
const logout = (req, res) => {
  res.json({
    message: 'Logged out successfully'
  });
};

// Verify token (for client-side validation)
const verifyToken = (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
};

module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
  verifyToken
};