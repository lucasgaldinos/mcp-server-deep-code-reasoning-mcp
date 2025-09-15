#!/bin/bash

# Deep Code Reasoning MCP Server Deployment Script
# Supports multiple deployment targets: local, staging, production

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="ghcr.io/lucasgaldinos/mcp-server-deep-code-reasoning-mcp"
NAMESPACE="mcp-deep-code-reasoning"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  local       Deploy locally using Docker Compose"
    echo "  staging     Deploy to staging Kubernetes cluster"
    echo "  production  Deploy to production Kubernetes cluster"
    echo "  build       Build Docker image"
    echo "  push        Push Docker image to registry"
    echo "  test        Run deployment tests"
    echo "  rollback    Rollback to previous deployment"
    echo "  status      Check deployment status"
    echo "  logs        Show deployment logs"
    echo "  cleanup     Clean up deployment resources"
    echo ""
    echo "Options:"
    echo "  --tag TAG          Specify image tag (default: latest)"
    echo "  --dry-run          Show what would be deployed without executing"
    echo "  --force            Force deployment even if checks fail"
    echo "  --no-build         Skip building Docker image"
    echo "  --wait             Wait for deployment to complete"
    echo "  --timeout SECONDS  Deployment timeout (default: 300)"
    echo ""
    echo "Examples:"
    echo "  $0 local --tag v1.2.3"
    echo "  $0 production --dry-run"
    echo "  $0 build --tag latest"
    echo "  $0 status staging"
}

# Parse command line arguments
COMMAND=""
TAG="latest"
DRY_RUN=false
FORCE=false
NO_BUILD=false
WAIT=false
TIMEOUT=300

while [[ $# -gt 0 ]]; do
    case $1 in
        local|staging|production|build|push|test|rollback|status|logs|cleanup)
            COMMAND="$1"
            shift
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --no-build)
            NO_BUILD=true
            shift
            ;;
        --wait)
            WAIT=true
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate command
if [[ -z "$COMMAND" ]]; then
    log_error "No command specified"
    show_usage
    exit 1
fi

# Pre-deployment checks
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        return 1
    fi
    
    # Check if required environment variables are set
    if [[ "$COMMAND" != "local" && "$COMMAND" != "build" && "$COMMAND" != "test" && -z "${GEMINI_API_KEY:-}" ]]; then
        log_warning "GEMINI_API_KEY environment variable not set"
        if [[ "$FORCE" != true ]]; then
            return 1
        fi
    fi
    
    # Check if kubectl is available for K8s deployments
    if [[ "$COMMAND" == "staging" || "$COMMAND" == "production" ]]; then
        if ! command -v kubectl &> /dev/null; then
            log_error "kubectl is not installed or not in PATH"
            return 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Build Docker image
build_image() {
    if [[ "$NO_BUILD" == true ]]; then
        log_info "Skipping Docker build (--no-build specified)"
        return 0
    fi
    
    log_info "Building Docker image: ${IMAGE_NAME}:${TAG}"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would execute: docker build -t ${IMAGE_NAME}:${TAG} ."
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    docker build -t "${IMAGE_NAME}:${TAG}" .
    
    log_success "Docker image built successfully"
}

# Push Docker image to registry
push_image() {
    log_info "Pushing Docker image: ${IMAGE_NAME}:${TAG}"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would execute: docker push ${IMAGE_NAME}:${TAG}"
        return 0
    fi
    
    docker push "${IMAGE_NAME}:${TAG}"
    
    log_success "Docker image pushed successfully"
}

# Deploy locally using Docker Compose
deploy_local() {
    log_info "Deploying locally using Docker Compose..."
    
    cd "$PROJECT_ROOT"
    
    # Create environment file if it doesn't exist
    if [[ ! -f .env ]]; then
        log_info "Creating .env file..."
        cat > .env << EOF
GEMINI_API_KEY=${GEMINI_API_KEY:-your-api-key-here}
LOG_LEVEL=${LOG_LEVEL:-info}
NODE_ENV=development
GRAFANA_PASSWORD=admin
EOF
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would execute: docker-compose up -d"
        return 0
    fi
    
    docker-compose up -d mcp-server
    
    if [[ "$WAIT" == true ]]; then
        log_info "Waiting for service to be ready..."
        sleep 10
        docker-compose ps
    fi
    
    log_success "Local deployment completed"
    log_info "Service available at: localhost (stdio transport)"
}

# Deploy to Kubernetes
deploy_k8s() {
    local environment="$1"
    log_info "Deploying to $environment environment..."
    
    # Update image tag in deployment manifest
    sed -i.bak "s|image: ${IMAGE_NAME}:.*|image: ${IMAGE_NAME}:${TAG}|g" "$PROJECT_ROOT/k8s/deployment.yml"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would apply Kubernetes manifests to $environment"
        log_info "[DRY RUN] kubectl apply -f $PROJECT_ROOT/k8s/"
        return 0
    fi
    
    # Apply Kubernetes manifests
    kubectl apply -f "$PROJECT_ROOT/k8s/"
    
    if [[ "$WAIT" == true ]]; then
        log_info "Waiting for deployment to complete..."
        kubectl rollout status deployment/deep-code-reasoning-mcp -n "$NAMESPACE" --timeout="${TIMEOUT}s"
    fi
    
    log_success "$environment deployment completed"
}

# Check deployment status
check_status() {
    local environment="${1:-local}"
    
    case "$environment" in
        local)
            log_info "Checking local deployment status..."
            cd "$PROJECT_ROOT"
            docker-compose ps
            ;;
        staging|production)
            log_info "Checking $environment deployment status..."
            kubectl get pods -n "$NAMESPACE" -l app=deep-code-reasoning-mcp
            kubectl get services -n "$NAMESPACE"
            ;;
    esac
}

# Show deployment logs
show_logs() {
    local environment="${1:-local}"
    
    case "$environment" in
        local)
            log_info "Showing local deployment logs..."
            cd "$PROJECT_ROOT"
            docker-compose logs -f mcp-server
            ;;
        staging|production)
            log_info "Showing $environment deployment logs..."
            kubectl logs -n "$NAMESPACE" -l app=deep-code-reasoning-mcp -f
            ;;
    esac
}

# Cleanup deployment
cleanup_deployment() {
    local environment="${1:-local}"
    
    case "$environment" in
        local)
            log_info "Cleaning up local deployment..."
            cd "$PROJECT_ROOT"
            if [[ "$DRY_RUN" == true ]]; then
                log_info "[DRY RUN] Would execute: docker-compose down -v"
            else
                docker-compose down -v
                log_success "Local cleanup completed"
            fi
            ;;
        staging|production)
            log_info "Cleaning up $environment deployment..."
            if [[ "$DRY_RUN" == true ]]; then
                log_info "[DRY RUN] Would delete Kubernetes resources in namespace $NAMESPACE"
            else
                kubectl delete -f "$PROJECT_ROOT/k8s/" || true
                log_success "$environment cleanup completed"
            fi
            ;;
    esac
}

# Run deployment tests
run_tests() {
    log_info "Running deployment tests..."
    
    cd "$PROJECT_ROOT"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would run: npm test"
        return 0
    fi
    
    # Run unit tests
    npm test
    
    # Run integration tests if available
    if [[ -f "test/integration.test.js" ]]; then
        npm run test:integration
    fi
    
    log_success "All tests passed"
}

# Main execution
main() {
    log_info "Starting deployment process: $COMMAND"
    
    # Run prerequisite checks
    if ! check_prerequisites; then
        log_error "Prerequisite checks failed"
        exit 1
    fi
    
    case "$COMMAND" in
        build)
            build_image
            ;;
        push)
            build_image
            push_image
            ;;
        local)
            build_image
            deploy_local
            ;;
        staging)
            build_image
            push_image
            deploy_k8s "staging"
            ;;
        production)
            build_image
            push_image
            deploy_k8s "production"
            ;;
        test)
            run_tests
            ;;
        status)
            check_status "${2:-local}"
            ;;
        logs)
            show_logs "${2:-local}"
            ;;
        cleanup)
            cleanup_deployment "${2:-local}"
            ;;
        rollback)
            log_info "Rollback functionality not yet implemented"
            exit 1
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
    
    log_success "Deployment process completed successfully"
}

# Execute main function
main "$@"
