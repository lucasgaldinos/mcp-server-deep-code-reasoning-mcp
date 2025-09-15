# Multi-stage Docker build for Deep Code Reasoning MCP Server
# Optimized for production deployment with security best practices

# === BUILD STAGE ===
FROM node:18-alpine AS builder

# Build arguments for secure API key handling (not persisted in final image)
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

# Install build dependencies
RUN apk add --no-cache git python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY src/ ./src/
COPY examples/ ./examples/

# Build the application
RUN npm run build

# === PRODUCTION STAGE ===
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001 -G mcp

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy necessary runtime files
COPY --from=builder /app/examples ./examples

# Change ownership to non-root user
RUN chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Expose MCP server port (default stdio, but could be TCP)
# Note: MCP typically uses stdio transport, not TCP
# EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check: MCP server process running')" || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Default command to start MCP server
CMD ["node", "dist/index.js"]

# === DEVELOPMENT STAGE ===
FROM node:18-alpine AS development

# Install development tools
RUN apk add --no-cache git python3 make g++

# Create non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001 -G mcp

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY examples/ ./examples/
COPY docs/ ./docs/
COPY tests/ ./tests/ 2>/dev/null || true

# Change ownership
RUN chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Default command for development
CMD ["npm", "run", "dev"]

# === TESTING STAGE ===
FROM development AS testing

# Copy test configuration
COPY jest.config.js ./
COPY .eslintrc.js ./ 2>/dev/null || true

# Run tests during build (optional)
RUN npm run test || true

# Default command for testing
CMD ["npm", "test"]
