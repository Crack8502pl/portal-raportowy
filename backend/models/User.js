const { query } = require('../config/database');
const bcrypt = require('bcrypt');
const { bcrypt: bcryptConfig } = require('../config/auth');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.username = userData.username;
    this.email = userData.email;
    this.passwordHash = userData.password_hash;
    this.role = userData.role;
    this.firstName = userData.first_name;
    this.lastName = userData.last_name;
    this.isActive = userData.is_active;
    this.createdAt = userData.created_at;
    this.updatedAt = userData.updated_at;
  }

  // Get full name
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  // Convert to safe object (without password hash)
  toSafeObject() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create a new user
  static async create({ username, email, password, role, firstName, lastName }) {
    try {
      // Hash the password
      const passwordHash = await bcrypt.hash(password, bcryptConfig.saltRounds);
      
      const result = await query(`
        INSERT INTO users (username, email, password_hash, role, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [username, email, passwordHash, role, firstName, lastName]);

      return new User(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint === 'users_username_key') {
          throw new Error('Username already exists');
        }
        if (error.constraint === 'users_email_key') {
          throw new Error('Email already exists');
        }
      }
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Find user by username
  static async findByUsername(username) {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Get all users (for admin)
  static async findAll({ limit = 50, offset = 0, role = null, isActive = null } = {}) {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (role) {
      params.push(role);
      sql += ` AND role = $${++paramCount}`;
    }

    if (isActive !== null) {
      params.push(isActive);
      sql += ` AND is_active = $${++paramCount}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows.map(row => new User(row));
  }

  // Count total users
  static async count({ role = null, isActive = null } = {}) {
    let sql = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (role) {
      params.push(role);
      sql += ` AND role = $${++paramCount}`;
    }

    if (isActive !== null) {
      params.push(isActive);
      sql += ` AND is_active = $${++paramCount}`;
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.passwordHash);
  }

  // Update user
  async update(updateData) {
    const allowedFields = ['username', 'email', 'role', 'first_name', 'last_name', 'is_active'];
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
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    try {
      const result = await query(sql, params);
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
      return this;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        if (error.constraint === 'users_username_key') {
          throw new Error('Username already exists');
        }
        if (error.constraint === 'users_email_key') {
          throw new Error('Email already exists');
        }
      }
      throw error;
    }
  }

  // Change password
  async changePassword(newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, bcryptConfig.saltRounds);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, this.id]
    );
    this.passwordHash = passwordHash;
    return this;
  }

  // Deactivate user
  async deactivate() {
    await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    this.isActive = false;
    return this;
  }

  // Activate user
  async activate() {
    await query(
      'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    this.isActive = true;
    return this;
  }

  // Delete user (soft delete by deactivation)
  async delete() {
    return await this.deactivate();
  }
}

module.exports = User;