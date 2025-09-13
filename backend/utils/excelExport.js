const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;
const Report = require('../models/Report');

class ExcelExporter {
  constructor() {
    this.workbook = null;
  }

  // Create workbook and worksheet
  createWorkbook(title = 'Raporty Pracownicze') {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'Portal Raportowy';
    this.workbook.lastModifiedBy = 'Portal Raportowy';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();

    const worksheet = this.workbook.addWorksheet(title);
    return worksheet;
  }

  // Style header row
  styleHeaderRow(worksheet, headerRow) {
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add borders
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }

  // Style data rows
  styleDataRows(worksheet, startRow, endRow) {
    for (let i = startRow; i <= endRow; i++) {
      const row = worksheet.getRow(i);
      
      // Alternate row colors
      if (i % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' }
        };
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Text alignment
        if (typeof cell.value === 'string') {
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        } else if (cell.value instanceof Date) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    }
  }

  // Export single report
  async exportSingleReport(reportId) {
    try {
      const report = await Report.findById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const worksheet = this.createWorkbook(`Raport - ${report.objectName}`);

      // Title and metadata
      worksheet.addRow(['RAPORT PRACOWNICZY']);
      worksheet.addRow([]);
      worksheet.addRow(['Data raportu:', new Date(report.reportDate).toLocaleDateString('pl-PL')]);
      worksheet.addRow(['Autor:', report.author ? report.author.fullName : 'Nieznany']);
      worksheet.addRow(['Wersja:', report.version]);
      worksheet.addRow(['Status:', report.status]);
      worksheet.addRow(['Utworzony:', new Date(report.createdAt).toLocaleString('pl-PL')]);
      worksheet.addRow([]);

      // Style title
      const titleRow = worksheet.getRow(1);
      titleRow.font = { bold: true, size: 16 };
      titleRow.alignment = { horizontal: 'center' };
      worksheet.mergeCells('A1:E1');

      // Report details
      worksheet.addRow(['SZCZEGÓŁY RAPORTU']);
      const detailsHeaderRow = worksheet.getRow(worksheet.rowCount);
      detailsHeaderRow.font = { bold: true, size: 12 };
      worksheet.mergeCells(`A${worksheet.rowCount}:E${worksheet.rowCount}`);
      
      worksheet.addRow([]);
      worksheet.addRow(['Nazwa obiektu:', report.objectName]);
      worksheet.addRow([]);
      worksheet.addRow(['Wykonane prace:']);
      worksheet.addRow([report.workPerformed]);
      worksheet.addRow([]);
      
      if (report.notesProblems) {
        worksheet.addRow(['Uwagi/Problemy:']);
        worksheet.addRow([report.notesProblems]);
        worksheet.addRow([]);
      }

      // Employees section
      if (report.employees && report.employees.length > 0) {
        worksheet.addRow(['WSPÓŁPRACOWNICY I GODZINY PRACY']);
        const employeesHeaderRow = worksheet.getRow(worksheet.rowCount);
        employeesHeaderRow.font = { bold: true, size: 12 };
        worksheet.mergeCells(`A${worksheet.rowCount}:E${worksheet.rowCount}`);
        
        worksheet.addRow([]);
        
        // Employees table header
        const empHeaderRow = worksheet.addRow([
          'Imię i nazwisko',
          'Stanowisko',
          'Data pracy',
          'Godzina rozpoczęcia',
          'Godzina zakończenia'
        ]);
        this.styleHeaderRow(worksheet, empHeaderRow);

        // Employee data
        const startDataRow = worksheet.rowCount + 1;
        report.employees.forEach(emp => {
          worksheet.addRow([
            emp.fullName,
            emp.position || '',
            new Date(emp.workDate).toLocaleDateString('pl-PL'),
            emp.startTime,
            emp.endTime
          ]);
        });
        
        this.styleDataRows(worksheet, startDataRow, worksheet.rowCount);
      }

      // Files section
      if (report.files && report.files.length > 0) {
        worksheet.addRow([]);
        worksheet.addRow(['ZAŁĄCZNIKI']);
        const filesHeaderRow = worksheet.getRow(worksheet.rowCount);
        filesHeaderRow.font = { bold: true, size: 12 };
        worksheet.mergeCells(`A${worksheet.rowCount}:E${worksheet.rowCount}`);
        
        worksheet.addRow([]);
        
        report.files.forEach(file => {
          worksheet.addRow([
            'Plik:',
            file.originalFilename,
            `Rozmiar: ${(file.fileSize / 1024).toFixed(1)} KB`,
            `Typ: ${file.mimeType}`,
            new Date(file.uploadedAt).toLocaleString('pl-PL')
          ]);
        });
      }

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, cellValue.length);
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      });

      // Generate filename
      const authorName = report.author ? 
        `${report.author.firstName}_${report.author.lastName}` : 
        'Nieznany_Autor';
      const objectName = report.objectName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const reportDate = new Date(report.reportDate).toISOString().split('T')[0];
      const filename = `${authorName}_${objectName}_${reportDate}.xlsx`;

      return { workbook: this.workbook, filename };
    } catch (error) {
      console.error('Export single report error:', error);
      throw error;
    }
  }

  // Export multiple reports
  async exportMultipleReports(filters = {}) {
    try {
      const reports = await Report.findAll({
        ...filters,
        limit: 1000 // Limit to prevent memory issues
      });

      if (reports.length === 0) {
        throw new Error('No reports found');
      }

      const worksheet = this.createWorkbook('Raporty Pracownicze');

      // Title
      worksheet.addRow(['RAPORTY PRACOWNICZE']);
      const titleRow = worksheet.getRow(1);
      titleRow.font = { bold: true, size: 16 };
      titleRow.alignment = { horizontal: 'center' };
      worksheet.mergeCells('A1:J1');

      // Export info
      worksheet.addRow([]);
      worksheet.addRow(['Data eksportu:', new Date().toLocaleString('pl-PL')]);
      worksheet.addRow(['Liczba raportów:', reports.length]);
      
      if (filters.startDate || filters.endDate) {
        const dateRange = `${filters.startDate || 'początek'} - ${filters.endDate || 'koniec'}`;
        worksheet.addRow(['Zakres dat:', dateRange]);
      }
      
      worksheet.addRow([]);

      // Table header
      const headerRow = worksheet.addRow([
        'ID',
        'Data raportu',
        'Autor',
        'Nazwa obiektu',
        'Wykonane prace',
        'Uwagi/Problemy',
        'Wersja',
        'Status',
        'Data utworzenia',
        'Liczba załączników'
      ]);
      
      this.styleHeaderRow(worksheet, headerRow);

      // Data rows
      const startDataRow = worksheet.rowCount + 1;
      
      for (const report of reports) {
        // Load additional data for each report
        const fullReport = await Report.findById(report.id);
        
        worksheet.addRow([
          report.id,
          new Date(report.reportDate).toLocaleDateString('pl-PL'),
          report.authorName || 'Nieznany',
          report.objectName,
          report.workPerformed.substring(0, 100) + (report.workPerformed.length > 100 ? '...' : ''),
          report.notesProblems ? 
            report.notesProblems.substring(0, 100) + (report.notesProblems.length > 100 ? '...' : '') : '',
          report.version,
          report.status,
          new Date(report.createdAt).toLocaleString('pl-PL'),
          fullReport.files ? fullReport.files.length : 0
        ]);
      }

      this.styleDataRows(worksheet, startDataRow, worksheet.rowCount);

      // Auto-fit columns
      worksheet.columns.forEach((column, index) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, cellValue.length);
        });
        
        // Set specific widths for certain columns
        if (index === 3 || index === 4 || index === 5) { // Object name, work performed, notes
          column.width = 30;
        } else if (index === 0) { // ID
          column.width = 10;
        } else {
          column.width = Math.min(Math.max(maxLength + 2, 12), 25);
        }
      });

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Raporty_Pracownicze_${dateStr}.xlsx`;

      return { workbook: this.workbook, filename };
    } catch (error) {
      console.error('Export multiple reports error:', error);
      throw error;
    }
  }

  // Save workbook to file
  async saveToFile(workbook, filename, outputDir = '/tmp') {
    try {
      const filePath = path.join(outputDir, filename);
      await workbook.xlsx.writeFile(filePath);
      return filePath;
    } catch (error) {
      console.error('Save workbook error:', error);
      throw error;
    }
  }

  // Get workbook as buffer
  async getBuffer(workbook) {
    try {
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Get workbook buffer error:', error);
      throw error;
    }
  }

  // Clean up temporary files
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Cleanup file error:', error);
    }
  }
}

// Create singleton instance
const excelExporter = new ExcelExporter();

module.exports = excelExporter;