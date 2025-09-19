#!/bin/bash

# VS Code MCP Integration Setup Script
# This script helps set up and validate VS Code integration for the Deep Code Reasoning MCP Server

set -e

echo "🚀 VS Code MCP Integration Setup"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -f "src/index.ts" ]]; then
    print_error "Please run this script from the mcp-server-deep-code-reasoning-mcp root directory"
    exit 1
fi

print_status "Starting VS Code MCP integration setup..."

# Step 1: Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version | cut -c2-)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [[ $NODE_MAJOR -lt 16 ]]; then
    print_error "Node.js version 16+ required. Current version: $NODE_VERSION"
    exit 1
fi
print_success "Node.js version $NODE_VERSION is supported"

# Step 2: Install dependencies
print_status "Installing dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 3: Build the project
print_status "Building the project..."
if npm run build; then
    print_success "Project built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Step 4: Verify build output
print_status "Verifying build output..."
if [[ -f "dist/src/index.js" ]]; then
    print_success "Build output verified: dist/src/index.js exists"
else
    print_error "Build output missing: dist/src/index.js not found"
    exit 1
fi

# Step 5: Check VS Code MCP configuration
print_status "Checking VS Code MCP configuration..."
if [[ -f ".vscode/mcp.json" ]]; then
    print_success "VS Code MCP configuration found"
    
    # Validate JSON syntax
    if python3 -m json.tool .vscode/mcp.json > /dev/null 2>&1; then
        print_success "MCP configuration has valid JSON syntax"
    else
        print_error "MCP configuration has invalid JSON syntax"
        exit 1
    fi
else
    print_warning "VS Code MCP configuration not found at .vscode/mcp.json"
    print_status "This is expected if running from a different workspace"
fi

# Step 6: Test server startup (without API key)
print_status "Testing server startup..."
timeout 5s node dist/src/index.js 2>&1 | head -5 &
SERVER_PID=$!
sleep 2

if ps -p $SERVER_PID > /dev/null 2>&1; then
    print_success "Server starts successfully (expects GEMINI_API_KEY validation error)"
    kill $SERVER_PID 2>/dev/null || true
else
    print_warning "Server startup test completed (expected to exit due to missing API key)"
fi

# Step 7: Check for common system dependencies
print_status "Checking system dependencies..."

# Check if python3 is available (needed for some development scripts)
if command -v python3 &> /dev/null; then
    print_success "Python3 is available"
else
    print_warning "Python3 not found - may be needed for some development scripts"
fi

# Check if tkinter is available (for Human-in-the-Loop server if configured)
if python3 -c "import tkinter" 2>/dev/null; then
    print_success "tkinter is available"
else
    print_warning "tkinter not available - install with: sudo apt-get install python3-tk"
fi

# Step 8: Provide setup instructions
echo ""
echo "🎯 VS Code Integration Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. 🔑 Get a Gemini API key from: https://aistudio.google.com/app/apikey"
echo "2. 🔄 Restart VS Code to reload MCP configuration"
echo "3. 💬 Open VS Code Copilot Chat and try using MCP tools"
echo "4. 🛠️ Available tools: health_check, hypothesis_test, trace_execution_path, and more"
echo ""
echo "Troubleshooting:"
echo "- Check VS Code Output panel → MCP for server logs"
echo "- Run 'npm run dev' for development with hot reload"
echo "- See docs/guides/vscode-integration-troubleshooting.md for detailed help"
echo ""

# Step 9: Test MCP tools availability (if API key is available)
if [[ -n "${GEMINI_API_KEY:-}" ]]; then
    print_status "GEMINI_API_KEY detected - testing full server functionality..."
    
    # Test server with real API key
    timeout 10s node dist/src/index.js &
    SERVER_PID=$!
    sleep 3
    
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        print_success "Server running successfully with API key"
        kill $SERVER_PID 2>/dev/null || true
    else
        print_warning "Server startup with API key failed - check key validity"
    fi
else
    print_warning "No GEMINI_API_KEY environment variable set"
    echo "           Set it temporarily for testing: export GEMINI_API_KEY='your-key-here'"
fi

print_success "Setup complete! Your Deep Code Reasoning MCP server is ready for VS Code integration."