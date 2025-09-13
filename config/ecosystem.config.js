// PM2 Ecosystem Configuration for Portal Raportowy
module.exports = {
  apps: [
    {
      name: 'portal-raportowy',
      script: './backend/server.js',
      cwd: '/path/to/portal-raportowy',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'portal_raportowy',
        DB_USER: 'postgres',
        DB_PASSWORD: 'admin',
        JWT_SECRET: 'your_production_jwt_secret_change_this',
        JWT_EXPIRES_IN: '24h',
        MAX_FILE_SIZE: '10485760',
        UPLOAD_PATH: './uploads',
        ALLOWED_FILE_TYPES: 'jpg,jpeg,png,gif,pdf,doc,docx,txt,xls,xlsx',
        RATE_LIMIT_MAX: '100',
        RATE_LIMIT_WINDOW: '900000',
        FRONTEND_URL: 'https://portal-raportowy.yourdomain.com',
        
        // Email configuration
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'your_email@gmail.com',
        SMTP_PASS: 'your_app_password',
        EMAIL_FROM: 'noreply@yourdomain.com'
      },
      
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      
      // Logging
      log_file: './logs/portal-raportowy.log',
      out_file: './logs/portal-raportowy-out.log',
      error_file: './logs/portal-raportowy-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart configuration
      watch: false, // Set to true in development
      ignore_watch: [
        'node_modules',
        'uploads',
        'logs',
        '.git'
      ],
      watch_options: {
        followSymlinks: false,
        usePolling: true,
        interval: 1000
      },
      
      // Restart conditions
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      restart_delay: 4000,
      
      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: true,
      
      // Health monitoring
      health_check_url: 'http://localhost:3000/api/health',
      health_check_grace_period: 3000,
      
      // Process management
      autorestart: true,
      node_args: ['--max_old_space_size=1024'],
      
      // Source map support
      source_map_support: true,
      
      // Graceful shutdown
      kill_retry_time: 100,
      
      // Custom restart conditions
      restart_cron: '0 2 * * *', // Restart daily at 2 AM
      
      // Additional metadata
      vizion: true,
      post_update: ['npm install', 'npm run build'],
      
      // Error handling
      min_uptime: '60s',
      max_restarts: 15,
      
      // Monitoring
      pmx: true,
      automation: false,
      
      // Custom configuration for Portal Raportowy
      increment_var: 'PORT',
      args: ['--color'],
      
      // File system events
      watch_delay: 1000,
      
      // Advanced PM2 features
      treekill: true,
      pmx: {
        network: true,
        ports: true
      }
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'portal',
      host: ['portal-raportowy.yourdomain.com'],
      ref: 'origin/main',
      repo: 'https://github.com/Crack8502pl/portal-raportowy.git',
      path: '/var/www/portal-raportowy',
      'post-deploy': 'npm install && npm run install-backend && npm run init-db && pm2 reload ecosystem.config.js --env production',
      'post-setup': 'ls -la',
      'pre-deploy-local': 'echo "Deploying to production"',
      'post-deploy-local': 'echo "Deployment completed"',
      env: {
        NODE_ENV: 'production'
      }
    },
    
    staging: {
      user: 'portal',
      host: ['staging.portal-raportowy.yourdomain.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/Crack8502pl/portal-raportowy.git',
      path: '/var/www/portal-raportowy-staging',
      'post-deploy': 'npm install && npm run install-backend && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};