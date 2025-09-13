const { createTransporter, emailConfig, renderTemplate } = require('../config/email');
const { query } = require('../config/database');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  // Initialize email service
  async init() {
    try {
      this.transporter = createTransporter();
      
      // Verify configuration
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.verify();
        this.isConfigured = true;
        console.log('Email service initialized successfully');
      } else {
        console.warn('Email service not configured - SMTP credentials missing');
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('Email service initialization failed:', error);
      this.isConfigured = false;
    }
  }

  // Send email
  async sendEmail({ to, subject, html, text = null }) {
    if (!this.isConfigured) {
      console.warn('Email not sent - service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: emailConfig.from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send new report notification
  async sendNewReportNotification(reportData, authorData) {
    try {
      const templateData = {
        authorName: `${authorData.firstName} ${authorData.lastName}`,
        reportDate: new Date(reportData.reportDate).toLocaleDateString('pl-PL'),
        objectName: reportData.objectName,
        workPerformed: reportData.workPerformed,
        notesProblems: reportData.notesProblems,
        collaborators: reportData.employees ? 
          reportData.employees.map(emp => emp.fullName).join(', ') : 
          'Brak współpracowników'
      };

      const subject = renderTemplate(emailConfig.templates.newReport.subject, templateData);
      const html = renderTemplate(emailConfig.templates.newReport.html, templateData);

      // Send to default recipients
      const recipients = emailConfig.defaultRecipients;
      
      const result = await this.sendEmail({
        to: recipients,
        subject,
        html
      });

      // Log email notification
      if (result.success) {
        for (const recipient of recipients) {
          await this.logEmailNotification({
            reportId: reportData.id,
            recipientEmail: recipient,
            subject,
            status: 'sent'
          });
        }
      } else {
        for (const recipient of recipients) {
          await this.logEmailNotification({
            reportId: reportData.id,
            recipientEmail: recipient,
            subject,
            status: 'failed'
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Send new report notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send report update notification
  async sendReportUpdateNotification(reportData, authorData) {
    try {
      const templateData = {
        authorName: `${authorData.firstName} ${authorData.lastName}`,
        version: reportData.version,
        updateDate: new Date().toLocaleDateString('pl-PL'),
        objectName: reportData.objectName
      };

      const subject = renderTemplate(emailConfig.templates.reportUpdate.subject, templateData);
      const html = renderTemplate(emailConfig.templates.reportUpdate.html, templateData);

      // Send to default recipients
      const recipients = emailConfig.defaultRecipients;
      
      const result = await this.sendEmail({
        to: recipients,
        subject,
        html
      });

      // Log email notification
      if (result.success) {
        for (const recipient of recipients) {
          await this.logEmailNotification({
            reportId: reportData.id,
            recipientEmail: recipient,
            subject,
            status: 'sent'
          });
        }
      } else {
        for (const recipient of recipients) {
          await this.logEmailNotification({
            reportId: reportData.id,
            recipientEmail: recipient,
            subject,
            status: 'failed'
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Send report update notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send custom email
  async sendCustomEmail({ to, subject, message, reportId = null }) {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Portal Raportowy - Wiadomość</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            Ten email został wysłany z systemu Portal Raportowy.
          </p>
        </div>
      `;

      const result = await this.sendEmail({
        to,
        subject,
        html
      });

      // Log email notification if related to a report
      if (reportId && result.success) {
        const recipients = Array.isArray(to) ? to : [to];
        for (const recipient of recipients) {
          await this.logEmailNotification({
            reportId,
            recipientEmail: recipient,
            subject,
            status: 'sent'
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Send custom email error:', error);
      return { success: false, error: error.message };
    }
  }

  // Log email notification to database
  async logEmailNotification({ reportId, recipientEmail, subject, status }) {
    try {
      await query(`
        INSERT INTO email_notifications (report_id, recipient_email, subject, status)
        VALUES ($1, $2, $3, $4)
      `, [reportId, recipientEmail, subject, status]);
    } catch (error) {
      console.error('Log email notification error:', error);
    }
  }

  // Get email notifications for a report
  async getReportEmailNotifications(reportId) {
    try {
      const result = await query(`
        SELECT * FROM email_notifications 
        WHERE report_id = $1 
        ORDER BY sent_at DESC
      `, [reportId]);

      return result.rows;
    } catch (error) {
      console.error('Get report email notifications error:', error);
      return [];
    }
  }

  // Simple HTML to text conversion
  htmlToText(html) {
    if (!html) return '';
    
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  // Test email configuration
  async testConfiguration(testEmail) {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const result = await this.sendEmail({
        to: testEmail,
        subject: 'Portal Raportowy - Test konfiguracji email',
        html: `
          <h2>Test konfiguracji email</h2>
          <p>Ten email został wysłany w celu przetestowania konfiguracji systemu Portal Raportowy.</p>
          <p><strong>Data wysłania:</strong> ${new Date().toLocaleString('pl-PL')}</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            Portal Raportowy - System zarządzania raportami pracowniczymi
          </p>
        `
      });

      return result;
    } catch (error) {
      console.error('Test email configuration error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;