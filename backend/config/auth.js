require('dotenv').config({ path: '../config/.env' });

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256'
  },
  bcrypt: {
    saltRounds: 12
  },
  roles: {
    EMPLOYEE: 'employee',
    COORDINATOR: 'coordinator',
    ADMINISTRATOR: 'administrator'
  },
  permissions: {
    employee: [
      'read:own_reports',
      'create:reports',
      'update:own_reports',
      'delete:own_reports'
    ],
    coordinator: [
      'read:own_reports',
      'read:all_reports',
      'create:reports',
      'update:own_reports',
      'delete:own_reports',
      'export:reports'
    ],
    administrator: [
      'read:own_reports',
      'read:all_reports',
      'create:reports',
      'update:own_reports',
      'update:all_reports',
      'delete:own_reports',
      'delete:all_reports',
      'export:reports',
      'manage:users',
      'manage:employees',
      'view:system_logs'
    ]
  }
};