# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production && \
    cd backend && npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p backend/uploads && chmod 755 backend/uploads

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S portal -u 1001 -G nodejs && \
    chown -R portal:nodejs /app

# Switch to non-root user
USER portal

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]