const validator = require('validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Create DOMPurify instance
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

class Sanitizer {
  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(html, options = {}) {
    if (!html) return '';
    
    const defaultOptions = {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      ALLOW_DATA_ATTR: false,
      FORBID_CONTENTS: ['script', 'object', 'embed', 'base', 'link', 'meta'],
      FORBID_TAGS: ['script', 'object', 'embed', 'base', 'link', 'meta', 'style']
    };

    const sanitizeOptions = { ...defaultOptions, ...options };
    return DOMPurify.sanitize(html, sanitizeOptions);
  }

  // Sanitize text input
  static sanitizeText(text) {
    if (!text) return '';
    return validator.escape(text.toString().trim());
  }

  // Sanitize and validate email
  static sanitizeEmail(email) {
    if (!email) return '';
    
    const sanitized = validator.normalizeEmail(email.toString().trim());
    return validator.isEmail(sanitized) ? sanitized : '';
  }

  // Sanitize URL
  static sanitizeUrl(url) {
    if (!url) return '';
    
    const sanitized = url.toString().trim();
    return validator.isURL(sanitized, {
      protocols: ['http', 'https', 'ftp'],
      require_protocol: true
    }) ? sanitized : '';
  }

  // Sanitize filename for file uploads
  static sanitizeFilename(filename) {
    if (!filename) return '';
    
    return filename
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
  }

  // Sanitize SQL-like input (basic protection)
  static sanitizeSql(input) {
    if (!input) return '';
    
    const dangerous = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
      'EXEC', 'EXECUTE', 'UNION', 'SCRIPT', '--', ';', '/*', '*/', 'xp_'
    ];
    
    let sanitized = input.toString().trim();
    
    dangerous.forEach(term => {
      const regex = new RegExp(term, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    return sanitized;
  }

  // Sanitize numeric input
  static sanitizeNumber(input, options = {}) {
    if (input === null || input === undefined || input === '') return null;
    
    const { 
      min = null, 
      max = null, 
      integers = false,
      allowNegative = true 
    } = options;
    
    let num = parseFloat(input);
    
    if (isNaN(num)) return null;
    
    if (integers) {
      num = Math.floor(num);
    }
    
    if (!allowNegative && num < 0) {
      num = Math.abs(num);
    }
    
    if (min !== null && num < min) return null;
    if (max !== null && num > max) return null;
    
    return num;
  }

  // Sanitize date input
  static sanitizeDate(dateInput) {
    if (!dateInput) return null;
    
    let date;
    
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      if (validator.isISO8601(dateInput)) {
        date = new Date(dateInput);
      } else {
        return null;
      }
    } else {
      return null;
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) return null;
    
    // Check reasonable date range (year 1900-2100)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return null;
    
    return date;
  }

  // Sanitize boolean input
  static sanitizeBoolean(input) {
    if (input === null || input === undefined) return null;
    
    const str = input.toString().toLowerCase().trim();
    
    if (['true', '1', 'yes', 'on', 'enabled'].includes(str)) {
      return true;
    }
    
    if (['false', '0', 'no', 'off', 'disabled'].includes(str)) {
      return false;
    }
    
    return null;
  }

  // Sanitize array input
  static sanitizeArray(input, sanitizeFunction = null) {
    if (!Array.isArray(input)) return [];
    
    if (sanitizeFunction && typeof sanitizeFunction === 'function') {
      return input.map(item => sanitizeFunction(item)).filter(item => item !== null);
    }
    
    return input.map(item => this.sanitizeText(item));
  }

  // Sanitize object keys and values
  static sanitizeObject(obj, schema = null) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key
      const cleanKey = this.sanitizeText(key);
      if (!cleanKey) continue;
      
      if (schema && schema[key]) {
        // Use schema-defined sanitization
        const schemaRule = schema[key];
        
        if (schemaRule.type === 'string') {
          sanitized[cleanKey] = this.sanitizeText(value);
        } else if (schemaRule.type === 'email') {
          sanitized[cleanKey] = this.sanitizeEmail(value);
        } else if (schemaRule.type === 'number') {
          sanitized[cleanKey] = this.sanitizeNumber(value, schemaRule.options);
        } else if (schemaRule.type === 'boolean') {
          sanitized[cleanKey] = this.sanitizeBoolean(value);
        } else if (schemaRule.type === 'date') {
          sanitized[cleanKey] = this.sanitizeDate(value);
        } else if (schemaRule.type === 'array') {
          sanitized[cleanKey] = this.sanitizeArray(value, schemaRule.sanitizeFunction);
        } else {
          sanitized[cleanKey] = value;
        }
      } else {
        // Default sanitization
        if (typeof value === 'string') {
          sanitized[cleanKey] = this.sanitizeText(value);
        } else if (typeof value === 'number') {
          sanitized[cleanKey] = this.sanitizeNumber(value);
        } else if (typeof value === 'boolean') {
          sanitized[cleanKey] = value;
        } else if (Array.isArray(value)) {
          sanitized[cleanKey] = this.sanitizeArray(value);
        } else if (value && typeof value === 'object') {
          sanitized[cleanKey] = this.sanitizeObject(value);
        } else {
          sanitized[cleanKey] = value;
        }
      }
    }
    
    return sanitized;
  }

  // Validate and sanitize phone number
  static sanitizePhone(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters except + at the beginning
    let sanitized = phone.toString().trim().replace(/[^\d+]/g, '');
    
    // Ensure + is only at the beginning
    if (sanitized.includes('+')) {
      const parts = sanitized.split('+');
      sanitized = '+' + parts.join('');
    }
    
    // Basic validation - phone numbers should be 7-15 digits
    const digits = sanitized.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      return '';
    }
    
    return sanitized;
  }

  // Remove potential script tags and dangerous content
  static removeScripts(content) {
    if (!content) return '';
    
    return content
      .toString()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/onload=/gi, '')
      .replace(/onerror=/gi, '')
      .replace(/onclick=/gi, '')
      .replace(/onmouseover=/gi, '');
  }

  // Comprehensive input sanitization for API requests
  static sanitizeApiInput(data, schema = null) {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeApiInput(item, schema));
    }
    
    if (data && typeof data === 'object') {
      return this.sanitizeObject(data, schema);
    }
    
    if (typeof data === 'string') {
      return this.sanitizeText(data);
    }
    
    return data;
  }
}

module.exports = Sanitizer;