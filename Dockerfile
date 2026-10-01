# Use Node.js 22 Alpine base image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Set default environment variables
ENV NODE_ENV=production \
    PORT=3000

# Copy package metadata and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy server code, database schema, and frontend assets
COPY server.js ./
COPY database/ ./database/
COPY frontend/ ./frontend/

# Create data directory with ownership for the non-root node user
RUN mkdir -p /app/data && chown -R node:node /app

# Switch to non-root user
USER node

# Expose application port
EXPOSE 3000

# Declare persistent volume for SQLite fallback
VOLUME ["/app/data"]

# Start the application
CMD ["npm", "start"]

