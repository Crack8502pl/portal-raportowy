const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

require('dotenv').config({ path: '../../config/.env' });

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'portal_raportowy',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
});

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing Portal Raportowy database...');

    // Read and execute the init.sql file
    const initSqlPath = path.join(__dirname, '../../database/init.sql');
    const initSql = await fs.readFile(initSqlPath, 'utf8');

    // Split SQL commands (simple split by semicolon)
    const commands = initSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Executing ${commands.length} SQL commands...`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      try {
        // Skip comments and empty commands
        if (command.startsWith('--') || command.trim() === '') {
          continue;
        }

        await pool.query(command);
        console.log(`✅ Command ${i + 1}/${commands.length} executed successfully`);
      } catch (error) {
        // Some commands might fail if objects already exist, that's okay
        if (error.code === '42P07' || error.code === '23505') {
          console.log(`⚠️  Command ${i + 1}/${commands.length} skipped (already exists): ${error.message}`);
        } else {
          console.error(`❌ Error executing command ${i + 1}/${commands.length}:`, error.message);
        }
      }
    }

    // Update default user passwords with proper bcrypt hashes
    console.log('🔐 Updating default user passwords...');

    const saltRounds = 12;
    const adminHash = await bcrypt.hash('admin123', saltRounds);
    const coordHash = await bcrypt.hash('coord123', saltRounds);
    const empHash = await bcrypt.hash('emp123', saltRounds);

    // Update admin password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [adminHash, 'admin']
    );

    // Update coordinator password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [coordHash, 'coordinator']
    );

    // Update employee password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [empHash, 'employee']
    );

    console.log('✅ Default passwords updated successfully');

    // Test the database connection and verify setup
    console.log('🧪 Testing database setup...');

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const employeeCount = await pool.query('SELECT COUNT(*) FROM employees');
    
    console.log(`👥 Users in database: ${userCount.rows[0].count}`);
    console.log(`👷 Employees in database: ${employeeCount.rows[0].count}`);

    // List all users
    const users = await pool.query('SELECT username, role, first_name, last_name FROM users ORDER BY role, username');
    console.log('\n📋 Default users created:');
    users.rows.forEach(user => {
      console.log(`   - ${user.username} (${user.role}): ${user.first_name} ${user.last_name}`);
    });

    console.log('\n🔑 Default login credentials:');
    console.log('   - Administrator: admin / admin123');
    console.log('   - Coordinator: coordinator / coord123');
    console.log('   - Employee: employee / emp123');

    console.log('\n🎉 Database initialized successfully!');
    console.log('🚀 You can now start the Portal Raportowy application.');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization if this script is called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;