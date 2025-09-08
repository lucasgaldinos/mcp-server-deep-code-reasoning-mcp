# Installation and Configuration Guide

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (or yarn equivalent)
- **TypeScript**: Version 4.9.0 or higher (for development)
- **Operating System**: Linux, macOS, or Windows with WSL2

### Required Dependencies

- **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **VS Code or Cursor**: With MCP extension installed
- **Git**: For version control and updates

### Memory Requirements

- **Minimum**: 2GB RAM available
- **Recommended**: 4GB RAM for optimal performance
- **Development**: 8GB RAM for full development environment

## Installation Methods

### Method 1: Quick Install for Cursor (Recommended)

The fastest way to get started:

1. **Click the install button**:
   [![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=deep-code-reasoning&config=eyJjb21tYW5kIjoibm9kZSIsImFyZ3MiOlsiL3BhdGgvdG8vZGVlcC1jb2RlLXJlYXNvbmluZy1tY3AvZGlzdC9pbmRleC5qcyJdLCJlbnYiOnsiR0VNSU5JX0FQSV9LRVkiOiJ5b3VyLWdlbWluaS1hcGkta2V5In19)

2. **Update the configuration**:
   - Replace `/path/to/deep-code-reasoning-mcp/` with your actual installation path
   - Set your Gemini API key

3. **Test the installation**:
   Open Cursor and verify the MCP server appears in available tools

### Method 2: Manual Installation from Source

#### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/lucasgaldinos/mcp-server-deep-code-reasoning-mcp.git
cd mcp-server-deep-code-reasoning-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Verify build succeeded
ls -la dist/
# Should see: index.js, index.d.ts, and other compiled files
```

#### Step 2: Test Installation

```bash
# Set API key temporarily
export GEMINI_API_KEY="your-api-key-here"

# Test server startup
npm start

# You should see: "MCP server running on stdio"
# Press Ctrl+C to stop
```

#### Step 3: Configure for Your Editor

Choose your editor configuration:

**For VS Code**:

```bash
# Create or edit MCP configuration
code ~/.vscode/mcp.json
```

**For Cursor**:

```bash
# Create or edit MCP configuration  
cursor ~/.cursor/mcp.json
```

### Method 3: npm Installation (Future Release)

```bash
# Coming soon - global installation
npm install -g deep-code-reasoning-mcp

# Then configure in your editor
deep-code-reasoning-mcp --configure
```

### Method 4: Docker Installation

```bash
# Build Docker image
docker build -t deep-code-reasoning-mcp .

# Run with environment variables
docker run -e GEMINI_API_KEY=your-key deep-code-reasoning-mcp

# Or use docker-compose
docker-compose up -d
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# Optional Configuration  
LOG_LEVEL=info                    # debug | info | warn | error
MAX_CONTEXT_SIZE=1000000         # Maximum tokens for Gemini
HEALTH_CHECK_INTERVAL=30000      # Health check interval (ms)
REQUEST_TIMEOUT=60000            # Request timeout (ms)
MAX_CONCURRENT_REQUESTS=5        # Concurrent analysis limit

# Development Configuration
NODE_ENV=production              # development | production
DEBUG_MODE=false                 # Enable detailed debugging
ENABLE_METRICS=true              # Enable performance metrics
```

### MCP Client Configuration

#### VS Code Configuration

Edit `~/.vscode/mcp.json`:

```json
{
  "inputs": [
    {
      "id": "gemini_api_key",
      "type": "promptString",
      "password": true,
      "description": "Gemini API Key from Google AI Studio"
    }
  ],
  "servers": {
    "deep-code-reasoning-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-server-deep-code-reasoning-mcp/dist/index.js"
      ],
      "env": {
        "GEMINI_API_KEY": "${input:gemini_api_key}",
        "LOG_LEVEL": "info"
      },
      "type": "stdio"
    }
  }
}
```

#### Cursor Configuration

Edit `~/.cursor/mcp.json`:

```json
{
  "inputs": [
    {
      "id": "gemini_api_key", 
      "type": "promptString",
      "password": true,
      "description": "Gemini API Key"
    }
  ],
  "servers": {
    "deep-code-reasoning-mcp": {
      "args": [
        "-c",
        "cd /absolute/path/to/mcp-server-deep-code-reasoning-mcp && npm run build && GEMINI_API_KEY=${input:gemini_api_key} npm start"
      ],
      "command": "bash",
      "type": "stdio"
    }
  }
}
```

#### Advanced Configuration Options

For production or advanced usage:

```json
{
  "servers": {
    "deep-code-reasoning-mcp": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/mcp-server-deep-code-reasoning-mcp",
      "env": {
        "GEMINI_API_KEY": "${input:gemini_api_key}",
        "LOG_LEVEL": "warn",
        "MAX_CONTEXT_SIZE": "2000000",
        "REQUEST_TIMEOUT": "120000",
        "MAX_CONCURRENT_REQUESTS": "3",
        "HEALTH_CHECK_INTERVAL": "60000"
      },
      "restart": true,
      "restartDelay": 5000,
      "maxRestarts": 5,
      "type": "stdio"
    }
  }
}
```

### Server Configuration Files

#### TypeScript Configuration (`tsconfig.json`)

The server uses specific TypeScript settings for optimal performance:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext", 
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@analyzers/*": ["./analyzers/*"],
      "@services/*": ["./services/*"],
      "@utils/*": ["./utils/*"],
      "@models/*": ["./models/*"],
      "@errors/*": ["./errors/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### Package Configuration (`package.json`)

Key build and run scripts:

```json
{
  "scripts": {
    "build": "tsc && tsc-alias",
    "dev": "tsx --watch src/index.ts",
    "start": "node dist/index.js", 
    "test": "NODE_OPTIONS='--experimental-vm-modules' jest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "rebuild": "npm run clean && npm run build"
  }
}
```

## Verification and Testing

### Basic Functionality Test

```bash
# 1. Start the server manually
cd /path/to/mcp-server-deep-code-reasoning-mcp
npm start

# 2. In another terminal, test MCP communication
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  node dist/index.js

# Expected output: List of 13 available tools
```

### Health Check Test

```bash
# Test health endpoints
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"health_summary","arguments":{}}}' | \
  node dist/index.js

# Expected: Health status report
```

### Integration Test with Editor

1. **Open your editor** (VS Code or Cursor)
2. **Check MCP status** in the extension panel
3. **Test a simple tool call**:
   - Type: "Use the health_summary tool to check server status"
   - Verify: Tool executes and returns health information

### Performance Test

```bash
# Run the built-in test suite
npm test

# Run performance benchmarks
npm run benchmark

# Load test (if available)
npm run load-test
```

## Troubleshooting Installation

### Common Issues and Solutions

#### Issue: `ERR_MODULE_NOT_FOUND`

**Problem**: TypeScript path aliases not resolving

**Solution**:

```bash
# Ensure tsc-alias is installed and runs after TypeScript compilation
npm install --save-dev tsc-alias
npm run build  # Should run: tsc && tsc-alias
```

#### Issue: API Key Not Working

**Problem**: Gemini API key authentication fails

**Solution**:

```bash
# Test API key directly
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://generativelanguage.googleapis.com/v1/models"

# If that works, check environment variable loading:
node -e "console.log('API Key:', process.env.GEMINI_API_KEY)"
```

#### Issue: Permission Denied

**Problem**: File permissions prevent execution

**Solution**:

```bash
# Fix file permissions
chmod +x dist/index.js

# Or run with explicit node
node dist/index.js
```

#### Issue: Port Already in Use

**Problem**: Another process using the required port

**Solution**:

```bash
# Find process using port (if applicable)
lsof -i :3000

# Kill process or use different port
kill -9 PID
```

#### Issue: Memory Errors

**Problem**: Insufficient memory for large context analysis

**Solution**:

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm start

# Or modify package.json start script:
"start": "node --max-old-space-size=4096 dist/index.js"
```

### Debug Mode Configuration

Enable detailed debugging:

```bash
# Set debug environment
export LOG_LEVEL=debug
export DEBUG_MODE=true
export NODE_ENV=development

# Run with debug output
npm start 2>&1 | tee debug.log

# Review debug information
grep "DEBUG" debug.log
```

### Log Analysis

Check server logs for issues:

```bash
# View real-time logs
tail -f logs/server.log

# Search for specific errors
grep -i "error\|fail\|timeout" logs/server.log

# Check health check results
grep "health_check" logs/server.log | tail -10
```

## Performance Optimization

### Production Configuration

For production deployments:

```bash
# Set production environment
export NODE_ENV=production
export LOG_LEVEL=warn
export MAX_CONCURRENT_REQUESTS=3

# Use process manager
npm install -g pm2
pm2 start dist/index.js --name "deep-code-reasoning-mcp"

# Monitor performance
pm2 monit
```

### Memory Optimization

```bash
# Configure memory limits
export NODE_OPTIONS="--max-old-space-size=2048"

# Monitor memory usage
node --expose-gc dist/index.js

# Force garbage collection if needed
# (This is handled automatically in production)
```

### Network Optimization

```bash
# Configure timeouts for slow networks
export REQUEST_TIMEOUT=120000
export HEALTH_CHECK_INTERVAL=60000

# Enable keep-alive for HTTP connections
export HTTP_KEEP_ALIVE=true
```

## Updating and Maintenance

### Updating the Server

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Rebuild
npm run rebuild

# Test after update
npm test

# Restart in editor (reload MCP configuration)
```

### Backup Configuration

```bash
# Backup your configuration
cp ~/.vscode/mcp.json ~/.vscode/mcp.json.backup
cp .env .env.backup

# Version control your configs (without secrets)
git add tsconfig.json package.json
git commit -m "Update configuration"
```

### Monitoring and Maintenance

```bash
# Regular health checks
npm run health-check

# Performance monitoring
npm run benchmark

# Log rotation (if needed)
logrotate /etc/logrotate.d/mcp-server
```

This installation and configuration guide provides comprehensive setup instructions for the Deep Code Reasoning MCP Server across different environments and use cases.
