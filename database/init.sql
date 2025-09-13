-- Portal Raportowy Database Schema
-- PostgreSQL Database Initialization

-- Create database (run as postgres superuser)
-- CREATE DATABASE portal_raportowy;

-- Connect to the database before running the rest

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'coordinator', 'administrator')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table for report assignments
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    position VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id),
    report_date DATE NOT NULL,
    object_name VARCHAR(300) NOT NULL,
    work_performed TEXT NOT NULL,
    notes_problems TEXT,
    version INTEGER DEFAULT 1,
    parent_report_id UUID REFERENCES reports(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure object_name, work_performed, notes_problems don't exceed 300 chars
    CONSTRAINT check_object_name_length CHECK (char_length(object_name) <= 300),
    CONSTRAINT check_work_performed_length CHECK (char_length(work_performed) <= 300),
    CONSTRAINT check_notes_problems_length CHECK (char_length(notes_problems) <= 300)
);

-- Report employees (many-to-many relationship with work hours)
CREATE TABLE report_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    work_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure end time is after start time
    CONSTRAINT check_work_hours CHECK (end_time > start_time),
    
    -- Unique constraint to prevent duplicate entries for same employee on same report
    UNIQUE(report_id, employee_id, work_date)
);

-- Report files table for attachments
CREATE TABLE report_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email notifications log
CREATE TABLE email_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id),
    recipient_email VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

-- Indexes for better performance
CREATE INDEX idx_reports_author_id ON reports(author_id);
CREATE INDEX idx_reports_date ON reports(report_date);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_report_employees_report_id ON report_employees(report_id);
CREATE INDEX idx_report_files_report_id ON report_files(report_id);
CREATE INDEX idx_email_notifications_report_id ON email_notifications(report_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default administrator user (password: admin123)
-- Password hash for 'admin123' using bcrypt with salt rounds 12
INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
VALUES ('admin', 'admin@portal-raportowy.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2jckfJeF0i', 'administrator', 'System', 'Administrator');

-- Insert sample coordinator (password: coord123)
INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
VALUES ('coordinator', 'coordinator@portal-raportowy.com', '$2b$12$VcCyQ2.Q2vQ5vQ3vQ4vQ5vQ6vQ7vQ8vQ9vQ0vQ1vQ2vQ3vQ4vQ5vQ', 'coordinator', 'Jan', 'Kowalski');

-- Insert sample employee (password: emp123)
INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
VALUES ('employee', 'employee@portal-raportowy.com', '$2b$12$AcBdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMnOpQr', 'employee', 'Anna', 'Nowak');

-- Insert sample employees for selection in reports
INSERT INTO employees (first_name, last_name, email, position) VALUES
('Piotr', 'Wiśniewski', 'piotr.wisniewski@example.com', 'Technik'),
('Maria', 'Dąbrowska', 'maria.dabrowska@example.com', 'Specjalista'),
('Tomasz', 'Lewandowski', 'tomasz.lewandowski@example.com', 'Kierownik'),
('Katarzyna', 'Wójcik', 'katarzyna.wojcik@example.com', 'Konsultant'),
('Michał', 'Kamiński', 'michal.kaminski@example.com', 'Analityk');

-- Grant permissions (run as postgres superuser if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO portal_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO portal_user;