const { query, getClient } = require('../config/database');

class Report {
  constructor(reportData) {
    this.id = reportData.id;
    this.authorId = reportData.author_id;
    this.reportDate = reportData.report_date;
    this.objectName = reportData.object_name;
    this.workPerformed = reportData.work_performed;
    this.notesProblems = reportData.notes_problems;
    this.version = reportData.version;
    this.parentReportId = reportData.parent_report_id;
    this.status = reportData.status;
    this.createdAt = reportData.created_at;
    this.updatedAt = reportData.updated_at;
  }

  // Convert to object with full data
  toObject() {
    return {
      id: this.id,
      authorId: this.authorId,
      reportDate: this.reportDate,
      objectName: this.objectName,
      workPerformed: this.workPerformed,
      notesProblems: this.notesProblems,
      version: this.version,
      parentReportId: this.parentReportId,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create a new report
  static async create({ authorId, reportDate, objectName, workPerformed, notesProblems, employees = [] }) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Insert the main report
      const reportResult = await client.query(`
        INSERT INTO reports (author_id, report_date, object_name, work_performed, notes_problems)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [authorId, reportDate, objectName, workPerformed, notesProblems]);

      const report = new Report(reportResult.rows[0]);

      // Insert report employees
      if (employees && employees.length > 0) {
        for (const emp of employees) {
          await client.query(`
            INSERT INTO report_employees (report_id, employee_id, start_time, end_time, work_date)
            VALUES ($1, $2, $3, $4, $5)
          `, [report.id, emp.employeeId, emp.startTime, emp.endTime, reportDate]);
        }
      }

      await client.query('COMMIT');
      return report;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Find report by ID with full details
  static async findById(id) {
    const result = await query('SELECT * FROM reports WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }

    const report = new Report(result.rows[0]);
    
    // Load associated data
    await report.loadEmployees();
    await report.loadFiles();
    await report.loadAuthor();
    
    return report;
  }

  // Find report by ID (simple, without associations)
  static async findByIdSimple(id) {
    const result = await query('SELECT * FROM reports WHERE id = $1', [id]);
    return result.rows.length > 0 ? new Report(result.rows[0]) : null;
  }

  // Get reports with pagination and filters
  static async findAll({ 
    authorId = null, 
    startDate = null, 
    endDate = null, 
    status = null,
    limit = 20, 
    offset = 0 
  } = {}) {
    let sql = `
      SELECT r.*, u.first_name, u.last_name, u.username
      FROM reports r
      JOIN users u ON r.author_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (authorId) {
      params.push(authorId);
      sql += ` AND r.author_id = $${++paramCount}`;
    }

    if (startDate) {
      params.push(startDate);
      sql += ` AND r.report_date >= $${++paramCount}`;
    }

    if (endDate) {
      params.push(endDate);
      sql += ` AND r.report_date <= $${++paramCount}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND r.status = $${++paramCount}`;
    }

    sql += ` ORDER BY r.report_date DESC, r.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    
    return result.rows.map(row => {
      const report = new Report(row);
      report.authorName = `${row.first_name} ${row.last_name}`;
      report.authorUsername = row.username;
      return report;
    });
  }

  // Count reports with filters
  static async count({ authorId = null, startDate = null, endDate = null, status = null } = {}) {
    let sql = 'SELECT COUNT(*) FROM reports WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (authorId) {
      params.push(authorId);
      sql += ` AND author_id = $${++paramCount}`;
    }

    if (startDate) {
      params.push(startDate);
      sql += ` AND report_date >= $${++paramCount}`;
    }

    if (endDate) {
      params.push(endDate);
      sql += ` AND report_date <= $${++paramCount}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND status = $${++paramCount}`;
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  }

  // Load report employees
  async loadEmployees() {
    const result = await query(`
      SELECT re.*, e.first_name, e.last_name, e.email, e.position
      FROM report_employees re
      JOIN employees e ON re.employee_id = e.id
      WHERE re.report_id = $1
      ORDER BY re.work_date, re.start_time
    `, [this.id]);

    this.employees = result.rows.map(row => ({
      id: row.employee_id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      email: row.email,
      position: row.position,
      startTime: row.start_time,
      endTime: row.end_time,
      workDate: row.work_date
    }));

    return this.employees;
  }

  // Load report files
  async loadFiles() {
    const result = await query(`
      SELECT * FROM report_files 
      WHERE report_id = $1
      ORDER BY uploaded_at
    `, [this.id]);

    this.files = result.rows.map(row => ({
      id: row.id,
      originalFilename: row.original_filename,
      storedFilename: row.stored_filename,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedAt: row.uploaded_at
    }));

    return this.files;
  }

  // Load report author
  async loadAuthor() {
    const result = await query(`
      SELECT id, username, email, first_name, last_name, role
      FROM users 
      WHERE id = $1
    `, [this.authorId]);

    if (result.rows.length > 0) {
      const author = result.rows[0];
      this.author = {
        id: author.id,
        username: author.username,
        email: author.email,
        firstName: author.first_name,
        lastName: author.last_name,
        fullName: `${author.first_name} ${author.last_name}`,
        role: author.role
      };
    }

    return this.author;
  }

  // Update report (creates new version)
  async update({ reportDate, objectName, workPerformed, notesProblems, employees = [] }) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Create new version of the report
      const newVersion = this.version + 1;
      
      const reportResult = await client.query(`
        INSERT INTO reports (
          author_id, report_date, object_name, work_performed, notes_problems,
          version, parent_report_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        this.authorId, 
        reportDate || this.reportDate, 
        objectName || this.objectName,
        workPerformed || this.workPerformed, 
        notesProblems || this.notesProblems,
        newVersion,
        this.parentReportId || this.id,
        'draft'
      ]);

      const newReport = new Report(reportResult.rows[0]);

      // Archive the current version
      await client.query(`
        UPDATE reports SET status = 'archived' WHERE id = $1
      `, [this.id]);

      // Insert new report employees
      if (employees && employees.length > 0) {
        for (const emp of employees) {
          await client.query(`
            INSERT INTO report_employees (report_id, employee_id, start_time, end_time, work_date)
            VALUES ($1, $2, $3, $4, $5)
          `, [newReport.id, emp.employeeId, emp.startTime, emp.endTime, reportDate || this.reportDate]);
        }
      }

      await client.query('COMMIT');
      return newReport;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all versions of a report
  static async getVersions(reportId) {
    const result = await query(`
      SELECT r.*, u.first_name, u.last_name
      FROM reports r
      JOIN users u ON r.author_id = u.id
      WHERE r.id = $1 OR r.parent_report_id = $1
      ORDER BY r.version ASC
    `, [reportId]);

    return result.rows.map(row => {
      const report = new Report(row);
      report.authorName = `${row.first_name} ${row.last_name}`;
      return report;
    });
  }

  // Add file to report
  async addFile({ originalFilename, storedFilename, filePath, fileSize, mimeType }) {
    const result = await query(`
      INSERT INTO report_files (
        report_id, original_filename, stored_filename, file_path, file_size, mime_type
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [this.id, originalFilename, storedFilename, filePath, fileSize, mimeType]);

    const fileData = {
      id: result.rows[0].id,
      originalFilename: result.rows[0].original_filename,
      storedFilename: result.rows[0].stored_filename,
      filePath: result.rows[0].file_path,
      fileSize: result.rows[0].file_size,
      mimeType: result.rows[0].mime_type,
      uploadedAt: result.rows[0].uploaded_at
    };

    if (!this.files) {
      this.files = [];
    }
    this.files.push(fileData);

    return fileData;
  }

  // Change report status
  async changeStatus(status) {
    await query(
      'UPDATE reports SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, this.id]
    );
    this.status = status;
    return this;
  }

  // Submit report (change status to submitted)
  async submit() {
    return await this.changeStatus('submitted');
  }

  // Archive report
  async archive() {
    return await this.changeStatus('archived');
  }

  // Delete report (soft delete by archiving)
  async delete() {
    return await this.archive();
  }
}

module.exports = Report;