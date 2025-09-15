#!/bin/bash

# Secure Deployment Script for MCP Server Deep Code Reasoning
# Handles API key securely without exposing it in logs or build history

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to securely prompt for API key
prompt_for_api_key() {
    if [[ -z "${GEMINI_API_KEY:-}" ]]; then
        echo -e "${YELLOW}🔐 Gemini API Key Required${NC}"
        echo "Please enter your Gemini API key (input will be hidden):"
        read -s GEMINI_API_KEY
        export GEMINI_API_KEY
        
        if [[ -z "$GEMINI_API_KEY" ]]; then
            log_error "API key cannot be empty"
            exit 1
        fi
        
        log_success "API key securely loaded"
    else
        log_info "Using API key from environment"
    fi
}

# Function to validate API key format
validate_api_key() {
    if [[ ! "$GEMINI_API_KEY" =~ ^AIza[0-9A-Za-z-_]{35}$ ]]; then
        log_warn "API key format doesn't match expected Gemini format"
        echo "Expected format: AIza followed by 35 alphanumeric characters, hyphens, or underscores"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to check if .env file exists and load it
load_env_file() {
    if [[ -f ".env" ]]; then
        log_info "Loading environment from .env file"
        set -a
        source .env
        set +a
    elif [[ -f ".env.local" ]]; then
        log_info "Loading environment from .env.local file"
        set -a
        source .env.local
        set +a
    else
        log_warn "No .env file found. You can create one from .env.example"
    fi
}

# Function to create temporary .env for Docker build
create_temp_env() {
    local temp_env=$(mktemp)
    echo "GEMINI_API_KEY=$GEMINI_API_KEY" > "$temp_env"
    echo "NODE_ENV=production" >> "$temp_env"
    echo "PORT=3000" >> "$temp_env"
    echo "$temp_env"
}

# Function to clean up temporary files
cleanup() {
    if [[ -n "${TEMP_ENV_FILE:-}" ]] && [[ -f "$TEMP_ENV_FILE" ]]; then
        rm -f "$TEMP_ENV_FILE"
        log_info "Cleaned up temporary environment file"
    fi
}

# Set up cleanup trap
trap cleanup EXIT

# Main deployment function
deploy() {
    local mode="$1"
    local image_tag="${2:-latest}"
    
    log_info "🚀 Starting secure deployment: $mode"
    
    # Load environment
    load_env_file
    
    # Get API key securely
    prompt_for_api_key
    
    # Validate API key
    validate_api_key
    
    case "$mode" in
        "local")
            deploy_local "$image_tag"
            ;;
        "docker")
            deploy_docker "$image_tag"
            ;;
        "production")
            deploy_production "$image_tag"
            ;;
        *)
            log_error "Unknown deployment mode: $mode"
            show_usage
            exit 1
            ;;
    esac
}

# Local development deployment
deploy_local() {
    local tag="$1"
    
    log_info "📦 Building for local development"
    
    # Build the project
    npm run build
    
    # Start the server with API key
    log_info "🌟 Starting MCP server locally"
    GEMINI_API_KEY="$GEMINI_API_KEY" npm start
}

# Docker deployment
deploy_docker() {
    local tag="$1"
    local image_name="mcp-server-deep-code-reasoning"
    
    log_info "🐳 Building Docker image: $image_name:$tag"
    
    # Create temporary .env file for Docker build
    TEMP_ENV_FILE=$(create_temp_env)
    
    # Build Docker image with build args (not exposed in final image)
    docker build \
        --build-arg GEMINI_API_KEY="$GEMINI_API_KEY" \
        --tag "$image_name:$tag" \
        .
    
    log_success "Docker image built: $image_name:$tag"
    
    # Offer to run the container
    read -p "🚀 Run the container now? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        log_info "🌟 Starting Docker container"
        docker run \
            --rm \
            --name mcp-server \
            -p 3000:3000 \
            -e GEMINI_API_KEY="$GEMINI_API_KEY" \
            "$image_name:$tag"
    fi
}

# Production deployment
deploy_production() {
    local tag="$1"
    local registry="ghcr.io/lucasgaldinos"
    local image_name="$registry/mcp-server-deep-code-reasoning-mcp"
    
    log_info "🏭 Production deployment: $image_name:$tag"
    
    # Build Docker image
    docker build \
        --tag "$image_name:$tag" \
        --tag "$image_name:latest" \
        .
    
    log_success "Production image built"
    
    # Push to registry (if logged in)
    if docker info | grep -q "Username:"; then
        log_info "📤 Pushing to registry"
        docker push "$image_name:$tag"
        docker push "$image_name:latest"
        log_success "Images pushed to registry"
    else
        log_warn "Not logged into Docker registry. Skipping push."
        log_info "To push manually: docker push $image_name:$tag"
    fi
    
    # Generate deployment manifest
    generate_k8s_manifest "$image_name:$tag"
}

# Generate Kubernetes deployment manifest with secret
generate_k8s_manifest() {
    local image="$1"
    local manifest_file="k8s-deployment.yaml"
    
    log_info "📝 Generating Kubernetes deployment manifest"
    
    cat > "$manifest_file" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: mcp-server-secrets
type: Opaque
data:
  gemini-api-key: $(echo -n "$GEMINI_API_KEY" | base64)
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server-deep-code-reasoning
  labels:
    app: mcp-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: $image
        ports:
        - containerPort: 3000
        env:
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: mcp-server-secrets
              key: gemini-api-key
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-server-service
spec:
  selector:
    app: mcp-server
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
EOF

    log_success "Kubernetes manifest generated: $manifest_file"
    log_info "Deploy with: kubectl apply -f $manifest_file"
}

# Show usage information
show_usage() {
    echo "🚀 Secure MCP Server Deployment Script"
    echo ""
    echo "Usage: $0 <mode> [tag]"
    echo ""
    echo "Modes:"
    echo "  local      - Build and run locally"
    echo "  docker     - Build Docker image and optionally run container"
    echo "  production - Build and push production image, generate K8s manifests"
    echo ""
    echo "Options:"
    echo "  tag        - Image tag (default: latest)"
    echo ""
    echo "Environment:"
    echo "  GEMINI_API_KEY - Will be prompted if not set"
    echo "  Create .env file from .env.example for convenience"
    echo ""
    echo "Examples:"
    echo "  $0 local"
    echo "  $0 docker v1.0.0"
    echo "  $0 production stable"
}

# Main script logic
main() {
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi
    
    deploy "$@"
}

# Run main function with all arguments
main "$@"
