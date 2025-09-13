const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

require('dotenv').config({ path: '../../config/.env' });

// Ensure uploads directory exists
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../uploads');
  try {
    await fs.access(uploadDir);
  } catch (error) {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Define allowed file types and their MIME types
const allowedFileTypes = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  
  // Spreadsheets
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
};

// Get all allowed extensions
const getAllowedExtensions = () => {
  const extensions = [];
  Object.values(allowedFileTypes).forEach(exts => {
    extensions.push(...exts);
  });
  return extensions;
};

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = await ensureUploadDir();
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename while preserving extension
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!allowedFileTypes[file.mimetype]) {
    const error = new Error(`File type not allowed. Allowed types: ${getAllowedExtensions().join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = allowedFileTypes[file.mimetype];
  
  if (!allowedExts.includes(ext)) {
    const error = new Error(`File extension not allowed. Allowed extensions: ${getAllowedExtensions().join(', ')}`);
    error.code = 'INVALID_FILE_EXTENSION';
    return cb(error, false);
  }
  
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per upload
  }
});

// Middleware for handling file upload errors
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: 'File too large',
          message: `Maximum file size is ${(parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files',
          message: 'Maximum 5 files allowed per upload',
          code: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected file field',
          code: 'UNEXPECTED_FILE'
        });
      default:
        return res.status(400).json({
          error: 'File upload error',
          message: error.message,
          code: 'UPLOAD_ERROR'
        });
    }
  }
  
  if (error.code === 'INVALID_FILE_TYPE' || error.code === 'INVALID_FILE_EXTENSION') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: error.message,
      code: error.code,
      allowedTypes: getAllowedExtensions()
    });
  }
  
  next(error);
};

// Middleware to validate uploaded files
const validateFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(); // No files uploaded, continue
  }
  
  // Add file information to request
  req.uploadedFiles = req.files.map(file => ({
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimeType: file.mimetype
  }));
  
  next();
};

// Clean up uploaded files (utility function)
const cleanupFiles = async (filePaths) => {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }
};

// Get file info (utility function)
const getFileInfo = async (filename) => {
  try {
    const uploadDir = await ensureUploadDir();
    const filePath = path.join(uploadDir, filename);
    const stats = await fs.stat(filePath);
    
    return {
      exists: true,
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
};

// Check if file exists (utility function)
const fileExists = async (filename) => {
  const info = await getFileInfo(filename);
  return info.exists;
};

module.exports = {
  upload,
  handleUploadErrors,
  validateFiles,
  cleanupFiles,
  getFileInfo,
  fileExists,
  getAllowedExtensions,
  ensureUploadDir
};