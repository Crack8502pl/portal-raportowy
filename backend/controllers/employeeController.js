const Employee = require('../models/Employee');

// Get all employees
const getEmployees = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      isActive = null,
      search = null
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let employees;
    let total;

    if (search) {
      // Search by name
      employees = await Employee.searchByName(search);
      total = employees.length;
      
      // Apply pagination to search results
      employees = employees.slice(offset, offset + parseInt(limit));
    } else {
      // Get all employees with pagination
      employees = await Employee.findAll({
        limit: parseInt(limit),
        offset,
        isActive: isActive !== null ? isActive === 'true' : null
      });

      total = await Employee.count({
        isActive: isActive !== null ? isActive === 'true' : null
      });
    }

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      employees: employees.map(employee => employee.toObject()),
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
    console.error('Get employees error:', error);
    res.status(500).json({
      error: 'Failed to get employees',
      code: 'GET_EMPLOYEES_ERROR'
    });
  }
};

// Get active employees for report selection
const getActiveEmployees = async (req, res) => {
  try {
    const employees = await Employee.getActiveEmployees();

    res.json({
      employees: employees.map(employee => ({
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: employee.fullName,
        position: employee.position
      }))
    });

  } catch (error) {
    console.error('Get active employees error:', error);
    res.status(500).json({
      error: 'Failed to get active employees',
      code: 'GET_ACTIVE_EMPLOYEES_ERROR'
    });
  }
};

// Get employee by ID
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    res.json({
      employee: employee.toObject()
    });

  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({
      error: 'Failed to get employee',
      code: 'GET_EMPLOYEE_ERROR'
    });
  }
};

// Create new employee
const createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, position } = req.body;

    const employee = await Employee.create({
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      position: position || null
    });

    res.status(201).json({
      message: 'Employee created successfully',
      employee: employee.toObject()
    });

  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      error: 'Failed to create employee',
      code: 'CREATE_EMPLOYEE_ERROR'
    });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, position, isActive } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const updatedEmployee = await employee.update({
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      position: position || null,
      isActive
    });

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee.toObject()
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      error: 'Failed to update employee',
      code: 'UPDATE_EMPLOYEE_ERROR'
    });
  }
};

// Deactivate employee
const deactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    await employee.deactivate();

    res.json({
      message: 'Employee deactivated successfully',
      employee: employee.toObject()
    });

  } catch (error) {
    console.error('Deactivate employee error:', error);
    res.status(500).json({
      error: 'Failed to deactivate employee',
      code: 'DEACTIVATE_EMPLOYEE_ERROR'
    });
  }
};

// Activate employee
const activateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    await employee.activate();

    res.json({
      message: 'Employee activated successfully',
      employee: employee.toObject()
    });

  } catch (error) {
    console.error('Activate employee error:', error);
    res.status(500).json({
      error: 'Failed to activate employee',
      code: 'ACTIVATE_EMPLOYEE_ERROR'
    });
  }
};

// Delete employee (soft delete by deactivation)
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    await employee.delete();

    res.json({
      message: 'Employee deleted successfully'
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      error: 'Failed to delete employee',
      code: 'DELETE_EMPLOYEE_ERROR'
    });
  }
};

// Get employee work history
const getEmployeeWorkHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20
    } = req.query;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        error: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const workHistory = await employee.getWorkHistory({
      limit: parseInt(limit),
      offset
    });

    res.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        position: employee.position
      },
      workHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get employee work history error:', error);
    res.status(500).json({
      error: 'Failed to get employee work history',
      code: 'GET_WORK_HISTORY_ERROR'
    });
  }
};

// Search employees by name
const searchEmployees = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters long',
        code: 'INVALID_SEARCH_QUERY'
      });
    }

    const employees = await Employee.searchByName(q.trim());

    res.json({
      employees: employees.map(employee => ({
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: employee.fullName,
        position: employee.position,
        isActive: employee.isActive
      }))
    });

  } catch (error) {
    console.error('Search employees error:', error);
    res.status(500).json({
      error: 'Failed to search employees',
      code: 'SEARCH_EMPLOYEES_ERROR'
    });
  }
};

// Get employee statistics
const getEmployeeStats = async (req, res) => {
  try {
    const totalEmployees = await Employee.count();
    const activeEmployees = await Employee.count({ isActive: true });
    const inactiveEmployees = await Employee.count({ isActive: false });

    res.json({
      stats: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees
      }
    });

  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({
      error: 'Failed to get employee statistics',
      code: 'GET_EMPLOYEE_STATS_ERROR'
    });
  }
};

module.exports = {
  getEmployees,
  getActiveEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  activateEmployee,
  deleteEmployee,
  getEmployeeWorkHistory,
  searchEmployees,
  getEmployeeStats
};