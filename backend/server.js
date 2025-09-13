const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config({ path: '../config/.env' });

// Import configuration and services
const { testConnection } = require('./config/database');
const emailService = require('./utils/emailService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const employeeRoutes = require('./routes/employees');
const reportRoutes = require('./routes/reports');

// Import middleware
const { sanitizeRequest } = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization middleware
app.use(sanitizeRequest);

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded files (with basic protection)
app.use('/uploads', (req, res, next) => {
  // Add basic security headers for file serving
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        email: emailService.isConfigured ? 'configured' : 'not configured'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Portal Raportowy API',
    version: '1.0.0',
    description: 'Employee Report Management System API',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/logout': 'Logout user',
        'GET /api/auth/profile': 'Get user profile',
        'PUT /api/auth/profile': 'Update user profile',
        'POST /api/auth/change-password': 'Change password',
        'GET /api/auth/verify-token': 'Verify JWT token'
      },
      users: {
        'GET /api/users': 'Get all users (admin)',
        'POST /api/users': 'Create user (admin)',
        'GET /api/users/:id': 'Get user by ID',
        'PUT /api/users/:id': 'Update user (admin)',
        'DELETE /api/users/:id': 'Delete user (admin)'
      },
      employees: {
        'GET /api/employees': 'Get all employees',
        'GET /api/employees/active': 'Get active employees',
        'POST /api/employees': 'Create employee',
        'GET /api/employees/:id': 'Get employee by ID',
        'PUT /api/employees/:id': 'Update employee',
        'DELETE /api/employees/:id': 'Delete employee'
      },
      reports: {
        'GET /api/reports': 'Get all reports',
        'POST /api/reports': 'Create report',
        'GET /api/reports/:id': 'Get report by ID',
        'PUT /api/reports/:id': 'Update report',
        'DELETE /api/reports/:id': 'Delete report',
        'GET /api/reports/:id/export': 'Export report to Excel',
        'POST /api/reports/export': 'Export multiple reports'
      }
    },
    authentication: 'JWT Bearer token required for most endpoints',
    roles: ['employee', 'coordinator', 'administrator']
  });
});

// Catch-all handler: serve frontend for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Handle specific error types
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      code: 'INVALID_JSON'
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request body too large',
      code: 'REQUEST_TOO_LARGE'
    });
  }

  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation',
      code: 'CORS_ERROR'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.path,
    method: req.method
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('🔄 Starting Portal Raportowy server...');

    // Test database connection
    console.log('🔍 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed. Please check your database configuration.');
      console.error('💡 Run "npm run init-db" to initialize the database.');
      process.exit(1);
    }

    // Initialize email service
    console.log('📧 Initializing email service...');
    await emailService.init();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Portal Raportowy server running on port ${PORT}`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
      console.log(`🔧 API: http://localhost:${PORT}/api`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode - detailed error messages enabled');
      }
      
      console.log('✅ Portal Raportowy is ready!');
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);
      
      server.close(() => {
        console.log('👋 Portal Raportowy server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;