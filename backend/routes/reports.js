const express = require('express');
const rateLimit = require('express-rate-limit');
const reportController = require('../controllers/reportController');
const { authenticateToken, requireRole, requireResourceAccess } = require('../middleware/auth');
const { validateReport } = require('../middleware/validation');
const { upload, handleUploadErrors, validateFiles } = require('../middleware/upload');
const excelExporter = require('../utils/excelExport');
const emailService = require('../utils/emailService');

const router = express.Router();

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Fewer uploads per window
  message: {
    error: 'Too many upload attempts',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  }
});

// All report routes require authentication
router.use(generalLimiter, authenticateToken);

// Get all reports with filters
router.get('/', reportController.getReports);

// Get specific report
router.get('/:id', requireResourceAccess, reportController.getReportById);

// Get report versions
router.get('/:id/versions', requireResourceAccess, reportController.getReportVersions);

// Get user's reports
router.get('/user/:userId', reportController.getUserReports);

// Create new report
router.post('/', 
  uploadLimiter,
  upload.array('files', 5), 
  handleUploadErrors, 
  validateFiles,
  validateReport,
  reportController.createReport
);

// Update report (creates new version)
router.put('/:id', 
  requireResourceAccess,
  uploadLimiter,
  upload.array('files', 5), 
  handleUploadErrors, 
  validateFiles,
  validateReport,
  reportController.updateReport
);

// Submit report
router.post('/:id/submit', requireResourceAccess, reportController.submitReport);

// Archive report (admin/coordinator)
router.post('/:id/archive', requireRole('administrator', 'coordinator'), reportController.archiveReport);

// Delete report
router.delete('/:id', requireResourceAccess, reportController.deleteReport);

// Add files to existing report
router.post('/:id/files', 
  requireResourceAccess,
  uploadLimiter,
  upload.array('files', 5), 
  handleUploadErrors, 
  validateFiles,
  reportController.addFileToReport
);

// Export single report to Excel
router.get('/:id/export', requireResourceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { workbook, filename } = await excelExporter.exportSingleReport(id);
    const buffer = await excelExporter.getBuffer(workbook);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      error: 'Failed to export report',
      code: 'EXPORT_ERROR'
    });
  }
});

// Export multiple reports to Excel (admin/coordinator)
router.post('/export', requireRole('administrator', 'coordinator'), async (req, res) => {
  try {
    const filters = req.body;
    
    const { workbook, filename } = await excelExporter.exportMultipleReports(filters);
    const buffer = await excelExporter.getBuffer(workbook);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error) {
    console.error('Export reports error:', error);
    res.status(500).json({
      error: 'Failed to export reports',
      code: 'EXPORT_ERROR'
    });
  }
});

// Send report via email
router.post('/:id/email', requireResourceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { recipients, subject, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Recipients are required',
        code: 'MISSING_RECIPIENTS'
      });
    }

    const result = await emailService.sendCustomEmail({
      to: recipients,
      subject: subject || `Portal Raportowy - Raport ID: ${id}`,
      message: message || 'W załączeniu znajdą Państwo raport z systemu Portal Raportowy.',
      reportId: id
    });

    if (result.success) {
      res.json({
        message: 'Email sent successfully',
        recipients: recipients.length
      });
    } else {
      res.status(500).json({
        error: 'Failed to send email',
        details: result.error,
        code: 'EMAIL_SEND_ERROR'
      });
    }
  } catch (error) {
    console.error('Send report email error:', error);
    res.status(500).json({
      error: 'Failed to send email',
      code: 'EMAIL_ERROR'
    });
  }
});

// Get report email notifications
router.get('/:id/notifications', requireResourceAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notifications = await emailService.getReportEmailNotifications(id);
    
    res.json({
      notifications
    });
  } catch (error) {
    console.error('Get report notifications error:', error);
    res.status(500).json({
      error: 'Failed to get notifications',
      code: 'GET_NOTIFICATIONS_ERROR'
    });
  }
});

module.exports = router;