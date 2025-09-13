const nodemailer = require('nodemailer');
require('dotenv').config({ path: '../config/.env' });

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email configuration
const emailConfig = {
  from: process.env.EMAIL_FROM || 'noreply@portal-raportowy.com',
  
  // Default recipients for report notifications
  defaultRecipients: [
    'koordynator@portal-raportowy.com',
    'manager@portal-raportowy.com'
  ],
  
  // Email templates
  templates: {
    newReport: {
      subject: 'Nowy raport został utworzony - {{objectName}}',
      html: `
        <h2>Nowy Raport Pracowniczy</h2>
        <p><strong>Autor:</strong> {{authorName}}</p>
        <p><strong>Data:</strong> {{reportDate}}</p>
        <p><strong>Obiekt:</strong> {{objectName}}</p>
        <p><strong>Wykonane prace:</strong></p>
        <div style="background-color: #f5f5f5; padding: 10px; border-left: 3px solid #007bff;">
          {{workPerformed}}
        </div>
        {{#if notesProblems}}
        <p><strong>Uwagi/Problemy:</strong></p>
        <div style="background-color: #fff3cd; padding: 10px; border-left: 3px solid #ffc107;">
          {{notesProblems}}
        </div>
        {{/if}}
        <p><strong>Współpracownicy:</strong> {{collaborators}}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Ten email został wygenerowany automatycznie przez Portal Raportowy.
        </p>
      `
    },
    
    reportUpdate: {
      subject: 'Raport został zaktualizowany (v{{version}}) - {{objectName}}',
      html: `
        <h2>Aktualizacja Raportu Pracowniczego</h2>
        <p><strong>Autor:</strong> {{authorName}}</p>
        <p><strong>Wersja:</strong> {{version}}</p>
        <p><strong>Data aktualizacji:</strong> {{updateDate}}</p>
        <p><strong>Obiekt:</strong> {{objectName}}</p>
        <p>Raport został zaktualizowany. Sprawdź szczegóły w systemie Portal Raportowy.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          Ten email został wygenerowany automatycznie przez Portal Raportowy.
        </p>
      `
    }
  }
};

// Template rendering function (simple string replacement)
const renderTemplate = (template, data) => {
  let rendered = template;
  
  // Replace simple variables {{variable}}
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value || '');
  }
  
  // Handle simple conditionals {{#if variable}}content{{/if}}
  rendered = rendered.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
    return data[variable] ? content : '';
  });
  
  return rendered;
};

// Verify transporter configuration
const verifyEmailConfig = async () => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Email configuration incomplete - SMTP credentials not provided');
      return false;
    }
    
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email server configuration verified successfully');
    return true;
  } catch (error) {
    console.error('Email configuration verification failed:', error.message);
    return false;
  }
};

module.exports = {
  createTransporter,
  emailConfig,
  renderTemplate,
  verifyEmailConfig
};