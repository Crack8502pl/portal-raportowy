const Report = require('../models/Report');
const { cleanupFiles } = require('../middleware/upload');

// Get all reports with filters
const getReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      authorId = null,
      startDate = null,
      endDate = null,
      status = null
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Filter by user role
    let filterAuthorId = authorId;
    if (req.user.role === 'employee') {
      // Employees can only see their own reports
      filterAuthorId = req.user.id;
    }

    const reports = await Report.findAll({
      authorId: filterAuthorId,
      startDate,
      endDate,
      status,
      limit: parseInt(limit),
      offset
    });

    const total = await Report.count({
      authorId: filterAuthorId,
      startDate,
      endDate,
      status
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      reports: reports.map(report => ({
        ...report.toObject(),
        authorName: report.authorName,
        authorUsername: report.authorUsername
      })),
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
    console.error('Get reports error:', error);
    res.status(500).json({
      error: 'Failed to get reports',
      code: 'GET_REPORTS_ERROR'
    });
  }
};

// Get report by ID
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    res.json({
      report: {
        ...report.toObject(),
        author: report.author,
        employees: report.employees,
        files: report.files
      }
    });

  } catch (error) {
    console.error('Get report by ID error:', error);
    res.status(500).json({
      error: 'Failed to get report',
      code: 'GET_REPORT_ERROR'
    });
  }
};

// Create new report
const createReport = async (req, res) => {
  try {
    const { reportDate, objectName, workPerformed, notesProblems, employees } = req.body;
    const authorId = req.user.id;

    const report = await Report.create({
      authorId,
      reportDate,
      objectName,
      workPerformed,
      notesProblems,
      employees
    });

    // Add uploaded files if any
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      for (const file of req.uploadedFiles) {
        await report.addFile({
          originalFilename: file.originalName,
          storedFilename: file.filename,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimeType
        });
      }
    }

    // Load the complete report data
    const completeReport = await Report.findById(report.id);

    res.status(201).json({
      message: 'Report created successfully',
      report: {
        ...completeReport.toObject(),
        author: completeReport.author,
        employees: completeReport.employees,
        files: completeReport.files
      }
    });

  } catch (error) {
    console.error('Create report error:', error);

    // Clean up uploaded files on error
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      const filePaths = req.uploadedFiles.map(file => file.path);
      await cleanupFiles(filePaths);
    }

    res.status(500).json({
      error: 'Failed to create report',
      code: 'CREATE_REPORT_ERROR'
    });
  }
};

// Update report (creates new version)
const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { reportDate, objectName, workPerformed, notesProblems, employees } = req.body;

    const report = await Report.findByIdSimple(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    // Create new version
    const newVersionReport = await report.update({
      reportDate,
      objectName,
      workPerformed,
      notesProblems,
      employees
    });

    // Add uploaded files if any
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      for (const file of req.uploadedFiles) {
        await newVersionReport.addFile({
          originalFilename: file.originalName,
          storedFilename: file.filename,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimeType
        });
      }
    }

    // Load the complete report data
    const completeReport = await Report.findById(newVersionReport.id);

    res.json({
      message: 'Report updated successfully',
      report: {
        ...completeReport.toObject(),
        author: completeReport.author,
        employees: completeReport.employees,
        files: completeReport.files
      }
    });

  } catch (error) {
    console.error('Update report error:', error);

    // Clean up uploaded files on error
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      const filePaths = req.uploadedFiles.map(file => file.path);
      await cleanupFiles(filePaths);
    }

    res.status(500).json({
      error: 'Failed to update report',
      code: 'UPDATE_REPORT_ERROR'
    });
  }
};

// Submit report
const submitReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByIdSimple(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await report.submit();

    res.json({
      message: 'Report submitted successfully',
      report: report.toObject()
    });

  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({
      error: 'Failed to submit report',
      code: 'SUBMIT_REPORT_ERROR'
    });
  }
};

// Archive report
const archiveReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByIdSimple(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await report.archive();

    res.json({
      message: 'Report archived successfully',
      report: report.toObject()
    });

  } catch (error) {
    console.error('Archive report error:', error);
    res.status(500).json({
      error: 'Failed to archive report',
      code: 'ARCHIVE_REPORT_ERROR'
    });
  }
};

// Delete report
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findByIdSimple(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await report.delete();

    res.json({
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      error: 'Failed to delete report',
      code: 'DELETE_REPORT_ERROR'
    });
  }
};

// Get report versions
const getReportVersions = async (req, res) => {
  try {
    const { id } = req.params;

    const versions = await Report.getVersions(id);
    if (versions.length === 0) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    res.json({
      versions: versions.map(report => ({
        ...report.toObject(),
        authorName: report.authorName
      }))
    });

  } catch (error) {
    console.error('Get report versions error:', error);
    res.status(500).json({
      error: 'Failed to get report versions',
      code: 'GET_REPORT_VERSIONS_ERROR'
    });
  }
};

// Get user's recent reports
const getUserReports = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 10,
      status = null
    } = req.query;

    // Check if user can access reports for this user ID
    if (req.user.role === 'employee' && userId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied - you can only access your own reports',
        code: 'ACCESS_DENIED'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const reports = await Report.findAll({
      authorId: userId,
      status,
      limit: parseInt(limit),
      offset
    });

    const total = await Report.count({
      authorId: userId,
      status
    });

    res.json({
      reports: reports.map(report => ({
        ...report.toObject(),
        authorName: report.authorName
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    });

  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({
      error: 'Failed to get user reports',
      code: 'GET_USER_REPORTS_ERROR'
    });
  }
};

// Add file to existing report
const addFileToReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        code: 'NO_FILES_UPLOADED'
      });
    }

    const report = await Report.findByIdSimple(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    const addedFiles = [];
    for (const file of req.uploadedFiles) {
      const fileData = await report.addFile({
        originalFilename: file.originalName,
        storedFilename: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimeType
      });
      addedFiles.push(fileData);
    }

    res.json({
      message: 'Files added successfully',
      files: addedFiles
    });

  } catch (error) {
    console.error('Add file to report error:', error);

    // Clean up uploaded files on error
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      const filePaths = req.uploadedFiles.map(file => file.path);
      await cleanupFiles(filePaths);
    }

    res.status(500).json({
      error: 'Failed to add files to report',
      code: 'ADD_FILE_ERROR'
    });
  }
};

module.exports = {
  getReports,
  getReportById,
  createReport,
  updateReport,
  submitReport,
  archiveReport,
  deleteReport,
  getReportVersions,
  getUserReports,
  addFileToReport
};