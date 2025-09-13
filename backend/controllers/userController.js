const User = require('../models/User');

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role = null,
      isActive = null,
      search = null
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.findAll({
      limit: parseInt(limit),
      offset,
      role,
      isActive: isActive !== null ? isActive === 'true' : null
    });

    const total = await User.count({
      role,
      isActive: isActive !== null ? isActive === 'true' : null
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      users: users.map(user => user.toSafeObject()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      code: 'GET_USERS_ERROR'
    });
  }
};

// Get user by ID (admin/coordinator)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      code: 'GET_USER_ERROR'
    });
  }
};

// Create new user (admin only)
const createUser = async (req, res) => {
  try {
    const { username, email, password, role, firstName, lastName } = req.body;

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
    console.error('Create user error:', error);
    
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
      error: 'Failed to create user',
      code: 'CREATE_USER_ERROR'
    });
  }
};

// Update user (admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, firstName, lastName, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const updatedUser = await user.update({
      username,
      email,
      role,
      firstName,
      lastName,
      isActive
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser.toSafeObject()
    });

  } catch (error) {
    console.error('Update user error:', error);
    
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
      error: 'Failed to update user',
      code: 'UPDATE_USER_ERROR'
    });
  }
};

// Change user password (admin only)
const changeUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
        code: 'INVALID_PASSWORD'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    await user.changePassword(newPassword);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change user password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
};

// Deactivate user (admin only)
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deactivation
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot deactivate your own account',
        code: 'SELF_DEACTIVATION_NOT_ALLOWED'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    await user.deactivate();

    res.json({
      message: 'User deactivated successfully',
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      error: 'Failed to deactivate user',
      code: 'DEACTIVATE_USER_ERROR'
    });
  }
};

// Activate user (admin only)
const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    await user.activate();

    res.json({
      message: 'User activated successfully',
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      error: 'Failed to activate user',
      code: 'ACTIVATE_USER_ERROR'
    });
  }
};

// Delete user (admin only) - soft delete by deactivation
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete your own account',
        code: 'SELF_DELETION_NOT_ALLOWED'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    await user.delete();

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      code: 'DELETE_USER_ERROR'
    });
  }
};

// Get user statistics (admin only)
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ isActive: true });
    const inactiveUsers = await User.count({ isActive: false });
    
    const employeeCount = await User.count({ role: 'employee' });
    const coordinatorCount = await User.count({ role: 'coordinator' });
    const adminCount = await User.count({ role: 'administrator' });

    res.json({
      stats: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        roles: {
          employee: employeeCount,
          coordinator: coordinatorCount,
          administrator: adminCount
        }
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get user statistics',
      code: 'GET_USER_STATS_ERROR'
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserPassword,
  deactivateUser,
  activateUser,
  deleteUser,
  getUserStats
};