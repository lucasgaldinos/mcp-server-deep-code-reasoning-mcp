# 🔐 Secure Deployment Guide

This guide shows you how to deploy the MCP Server Deep Code Reasoning with your API key securely without exposing it.

## 🎯 Quick Start

### Option 1: Interactive Secure Deployment (Recommended)

```bash
# The script will securely prompt for your API key
./scripts/secure-deploy.sh docker

# For production deployment
./scripts/secure-deploy.sh production v1.0.0
```

### Option 2: Environment File (Local Development)

```bash
# 1. Create your environment file
cp .env.example .env

# 2. Edit .env and add your real API key
nano .env  # or your preferred editor

# 3. Deploy locally
./scripts/secure-deploy.sh local
```

## 🛡️ Security Features

### ✅ What This Setup Does Right

- **No API Key in Logs**: API key input is hidden and not logged
- **No API Key in Build History**: Build args don't persist in Docker images
- **Runtime Environment Variables**: API key only exists in container environment
- **Kubernetes Secrets**: Production deployments use K8s secrets
- **Base64 Encoding**: Secrets are properly encoded for K8s
- **Temporary Files Cleanup**: No sensitive data left on disk

### ⚠️ Security Best Practices

1. **Never commit .env files** (already in .gitignore)
2. **Use different API keys for different environments**
3. **Rotate API keys regularly**
4. **Use cloud secret managers in production** (AWS Secrets Manager, Azure Key Vault, etc.)

## 🚀 Deployment Options

### 1. Local Development

```bash
# Secure interactive prompt
./scripts/secure-deploy.sh local

# Using environment file
export GEMINI_API_KEY="your-api-key-here"
npm run build && npm start
```

### 2. Docker Container

```bash
# Interactive secure deployment
./scripts/secure-deploy.sh docker latest

# Manual Docker deployment with environment
docker build -t mcp-server .
docker run -e GEMINI_API_KEY="your-api-key-here" -p 3000:3000 mcp-server
```

### 3. Production (Kubernetes)

```bash
# Generate secure K8s manifests
./scripts/secure-deploy.sh production stable

# Deploy to Kubernetes
kubectl apply -f k8s-deployment.yaml
```

### 4. Cloud Platforms

#### Docker Compose (Local/Development)

```yaml
# docker-compose.yml
version: '3.8'
services:
  mcp-server:
    build: .
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    ports:
      - "3000:3000"
```

```bash
# Deploy with environment
GEMINI_API_KEY="your-api-key-here" docker-compose up
```

#### AWS ECS Task Definition

```json
{
  "family": "mcp-server",
  "taskDefinition": {
    "containerDefinitions": [{
      "name": "mcp-server",
      "image": "your-registry/mcp-server:latest",
      "environment": [],
      "secrets": [{
        "name": "GEMINI_API_KEY",
        "valueFrom": "arn:aws:secretsmanager:region:account:secret:mcp/gemini-api-key"
      }]
    }]
  }
}
```

#### Google Cloud Run

```bash
# Deploy with secret from Secret Manager
gcloud run deploy mcp-server \
  --image=gcr.io/your-project/mcp-server \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="GEMINI_API_KEY=projects/your-project/secrets/gemini-api-key:latest"
```

#### Azure Container Instances

```bash
# Deploy with Key Vault secret
az container create \
  --resource-group myResourceGroup \
  --name mcp-server \
  --image your-registry/mcp-server:latest \
  --secure-environment-variables GEMINI_API_KEY=your-secret-value
```

## 🔧 Environment Variables

### Required

- `GEMINI_API_KEY`: Your Google Gemini API key

### Optional Configuration

```bash
# Server Settings
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Performance Tuning
MAX_CONCURRENT_REQUESTS=10
REQUEST_TIMEOUT_MS=30000
MEMORY_LIMIT_MB=512

# Security
CORS_ORIGIN=*
RATE_LIMIT_REQUESTS_PER_MINUTE=60

# Caching
CACHE_TTL_SECONDS=300
CACHE_MAX_SIZE=1000
```

## 🧪 Testing Your Deployment

### 1. Health Check

```bash
# Local
curl http://localhost:3000/health

# Docker
docker exec mcp-server curl http://localhost:3000/health

# Kubernetes
kubectl port-forward deployment/mcp-server-deep-code-reasoning 3000:3000
curl http://localhost:3000/health
```

### 2. MCP Server Test

```bash
# Test MCP server functionality
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
```

### 3. API Key Validation

The deployment script includes API key format validation:

- Expected format: `AIza` followed by 35 alphanumeric characters, hyphens, or underscores
- The script will warn if format doesn't match but allow you to continue

## 🔍 Troubleshooting

### Common Issues

#### 1. API Key Not Working

```bash
# Check if API key is set
echo $GEMINI_API_KEY | cut -c1-8  # Should show "AIzaSyBd" or similar

# Test API key directly
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$GEMINI_API_KEY"
```

#### 2. Docker Build Fails

```bash
# Build with verbose output
docker build --progress=plain --no-cache -t mcp-server .

# Check build logs
docker build --build-arg GEMINI_API_KEY="$GEMINI_API_KEY" -t mcp-server . 2>&1 | tee build.log
```

#### 3. Container Won't Start

```bash
# Check container logs
docker logs mcp-server

# Run container in interactive mode
docker run -it --entrypoint /bin/sh mcp-server
```

#### 4. Kubernetes Deployment Issues

```bash
# Check pod status
kubectl get pods -l app=mcp-server

# Check pod logs
kubectl logs deployment/mcp-server-deep-code-reasoning

# Check secret
kubectl get secret mcp-server-secrets -o yaml
```

## 📚 Additional Resources

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Kubernetes Secrets Management](https://kubernetes.io/docs/concepts/configuration/secret/)

## 🆘 Support

If you encounter issues:

1. Check the logs for error messages
2. Verify your API key is valid and has sufficient quota
3. Ensure all required environment variables are set
4. Review the troubleshooting section above
5. Check the GitHub Issues for similar problems

Remember: **Never share your actual API key in logs, issues, or support requests!**
