#!/bin/bash

# Quick Setup Script for MCP Server Deep Code Reasoning
# Helps you get started quickly with secure API key management

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 MCP Server Deep Code Reasoning - Quick Setup${NC}"
echo ""

# Check if .env file exists
if [[ ! -f ".env" ]]; then
    echo -e "${YELLOW}📋 Setting up environment configuration...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file from template${NC}"
    echo ""
    echo -e "${YELLOW}📝 Next steps:${NC}"
    echo "1. Edit .env file and add your Gemini API key"
    echo "2. Get your API key from: https://makersuite.google.com/app/apikey"
    echo ""
    read -p "🔧 Open .env file for editing now? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        ${EDITOR:-nano} .env
    fi
else
    echo -e "${GREEN}✅ Environment file (.env) already exists${NC}"
fi

echo ""
echo -e "${BLUE}🎯 Choose your deployment option:${NC}"
echo ""
echo "1. 🖥️  Local development (npm start)"
echo "2. 🐳 Docker container (recommended)"
echo "3. 🏭 Production deployment"
echo "4. 📖 Show deployment guide"
echo ""

read -p "Enter your choice (1-4): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo -e "${BLUE}🖥️  Starting local development...${NC}"
        ./scripts/secure-deploy.sh local
        ;;
    2)
        echo -e "${BLUE}🐳 Building Docker container...${NC}"
        ./scripts/secure-deploy.sh docker
        ;;
    3)
        echo -e "${BLUE}🏭 Production deployment...${NC}"
        read -p "Enter image tag (default: latest): " tag
        tag=${tag:-latest}
        ./scripts/secure-deploy.sh production "$tag"
        ;;
    4)
        echo -e "${BLUE}📖 Opening deployment guide...${NC}"
        if command -v less &> /dev/null; then
            less SECURE_DEPLOYMENT.md
        elif command -v more &> /dev/null; then
            more SECURE_DEPLOYMENT.md
        else
            cat SECURE_DEPLOYMENT.md
        fi
        ;;
    *)
        echo -e "${YELLOW}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac
