const { query } = require('../config/database');

class Employee {
  constructor(employeeData) {
    this.id = employeeData.id;
    this.firstName = employeeData.first_name;
    this.lastName = employeeData.last_name;
    this.email = employeeData.email;
    this.phone = employeeData.phone;
    this.position = employeeData.position;
    this.isActive = employeeData.is_active;
    this.createdAt = employeeData.created_at;
    this.updatedAt = employeeData.updated_at;
  }

  // Get full name
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  // Convert to object
  toObject() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      email: this.email,
      phone: this.phone,
      position: this.position,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create a new employee
  static async create({ firstName, lastName, email = null, phone = null, position = null }) {
    try {
      const result = await query(`
        INSERT INTO employees (first_name, last_name, email, phone, position)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [firstName, lastName, email, phone, position]);

      return new Employee(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find employee by ID
  static async findById(id) {
    const result = await query('SELECT * FROM employees WHERE id = $1', [id]);
    return result.rows.length > 0 ? new Employee(result.rows[0]) : null;
  }

  // Find employee by name
  static async findByName(firstName, lastName) {
    const result = await query(
      'SELECT * FROM employees WHERE first_name = $1 AND last_name = $2',
      [firstName, lastName]
    );
    return result.rows.map(row => new Employee(row));
  }

  // Search employees by name (partial match)
  static async searchByName(searchTerm) {
    const result = await query(`
      SELECT * FROM employees 
      WHERE LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
      OR LOWER(last_name || ' ' || first_name) LIKE LOWER($1)
      ORDER BY first_name, last_name
    `, [`%${searchTerm}%`]);
    
    return result.rows.map(row => new Employee(row));
  }

  // Get all employees
  static async findAll({ limit = 50, offset = 0, isActive = null } = {}) {
    let sql = 'SELECT * FROM employees WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (isActive !== null) {
      params.push(isActive);
      sql += ` AND is_active = $${++paramCount}`;
    }

    sql += ` ORDER BY first_name, last_name LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows.map(row => new Employee(row));
  }

  // Get active employees for report selection
  static async getActiveEmployees() {
    const result = await query(`
      SELECT * FROM employees 
      WHERE is_active = true 
      ORDER BY first_name, last_name
    `);
    return result.rows.map(row => new Employee(row));
  }

  // Count total employees
  static async count({ isActive = null } = {}) {
    let sql = 'SELECT COUNT(*) FROM employees WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (isActive !== null) {
      params.push(isActive);
      sql += ` AND is_active = $${++paramCount}`;
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  }

  // Update employee
  async update(updateData) {
    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'position', 'is_active'];
    const updates = [];
    const params = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updates.push(`${dbField} = $${++paramCount}`);
        params.push(value);
      }
    }

    if (updates.length === 0) {
      return this;
    }

    params.push(this.id);
    const sql = `
      UPDATE employees 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await query(sql, params);
    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Deactivate employee
  async deactivate() {
    await query(
      'UPDATE employees SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    this.isActive = false;
    return this;
  }

  // Activate employee
  async activate() {
    await query(
      'UPDATE employees SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    this.isActive = true;
    return this;
  }

  // Get employee's work history (reports they participated in)
  async getWorkHistory({ limit = 20, offset = 0 } = {}) {
    const result = await query(`
      SELECT r.*, u.first_name as author_first_name, u.last_name as author_last_name,
             re.start_time, re.end_time, re.work_date
      FROM reports r
      JOIN report_employees re ON r.id = re.report_id
      JOIN users u ON r.author_id = u.id
      WHERE re.employee_id = $1
      ORDER BY re.work_date DESC, r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [this.id, limit, offset]);

    return result.rows.map(row => ({
      report: {
        id: row.id,
        reportDate: row.report_date,
        objectName: row.object_name,
        workPerformed: row.work_performed,
        notesProblems: row.notes_problems,
        version: row.version,
        status: row.status,
        authorName: `${row.author_first_name} ${row.author_last_name}`
      },
      workDetails: {
        startTime: row.start_time,
        endTime: row.end_time,
        workDate: row.work_date
      }
    }));
  }

  // Delete employee (soft delete by deactivation)
  async delete() {
    return await this.deactivate();
  }
}

module.exports = Employee;