#!/bin/bash

#######################################################################
# Article Saver Desktop - Enterprise Restart Script
# Version: 1.0.0
# Description: Professional-grade restart script with comprehensive
#              error handling, logging, and process management
#######################################################################

set -euo pipefail  # Strict error handling

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
readonly LOG_DIR="$PROJECT_DIR/logs"
readonly LOG_FILE="$LOG_DIR/restart-$(date +%Y%m%d_%H%M%S).log"
readonly PID_FILE="$PROJECT_DIR/.desktop-dev.pid"
readonly TIMEOUT_SECONDS=30
readonly MAX_RETRIES=3

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log() {
    # Ensure log directory exists before first log
    mkdir -p "$LOG_DIR" 2>/dev/null || true
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $*"
}

log_warn() {
    log "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    log "${RED}[ERROR]${NC} $*"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $*"
}

# Error handling
handle_error() {
    local exit_code=$?
    log_error "Script failed with exit code $exit_code at line $1"
    cleanup
    exit $exit_code
}

# Cleanup function
cleanup() {
    log_info "Performing cleanup..."
    
    # Kill any remaining processes
    if [[ -f "$PID_FILE" ]]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            log_info "Terminating process group $pid"
            kill -TERM -"$pid" 2>/dev/null || true
            sleep 2
            kill -KILL -"$pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi
    
    # Kill any lingering Node.js/Electron processes
    pkill -f "vite.*19858" 2>/dev/null || true
    pkill -f "electron.*article" 2>/dev/null || true
    sleep 1
}

# Setup function
setup() {
    log_info "Setting up environment..."
    
    # Ensure log directory exists
    mkdir -p "$LOG_DIR"
    
    # Change to project directory
    cd "$PROJECT_DIR"
    
    # Verify we're in the correct directory
    if [[ ! -f "package.json" ]]; then
        log_error "Not in a valid Node.js project directory"
        exit 1
    fi
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed or not in PATH"
        exit 1
    fi
}

# Stop existing processes
stop_processes() {
    log_info "Stopping existing development processes..."
    
    local retry_count=0
    while [[ $retry_count -lt $MAX_RETRIES ]]; do
        # Check for running processes
        local vite_pid electron_pid
        vite_pid=$(pgrep -f "vite.*19858" 2>/dev/null | head -1 || echo "")
        electron_pid=$(pgrep -f "electron.*article" 2>/dev/null | head -1 || echo "")
        
        if [[ -z "$vite_pid" && -z "$electron_pid" ]]; then
            log_success "All processes stopped successfully"
            return 0
        fi
        
        log_info "Attempt $((retry_count + 1))/$MAX_RETRIES: Stopping processes..."
        
        # Graceful shutdown
        [[ -n "$vite_pid" ]] && kill -TERM "$vite_pid" 2>/dev/null || true
        [[ -n "$electron_pid" ]] && kill -TERM "$electron_pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        sleep 3
        
        # Force kill if still running
        [[ -n "$vite_pid" ]] && kill -KILL "$vite_pid" 2>/dev/null || true
        [[ -n "$electron_pid" ]] && kill -KILL "$electron_pid" 2>/dev/null || true
        
        ((retry_count++))
        sleep 2
    done
    
    log_warn "Some processes may still be running after $MAX_RETRIES attempts"
}

# Health check function
health_check() {
    log_info "Performing health check..."
    
    # Check if port 19858 is available
    if lsof -ti:19858 >/dev/null 2>&1; then
        log_warn "Port 19858 is still in use, attempting to free it..."
        local port_pid
        port_pid=$(lsof -ti:19858)
        kill -TERM "$port_pid" 2>/dev/null || true
        sleep 2
        kill -KILL "$port_pid" 2>/dev/null || true
    fi
    
    # Check disk space
    local available_space
    available_space=$(df "$PROJECT_DIR" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 1048576 ]]; then  # Less than 1GB in KB
        log_warn "Low disk space: ${available_space}KB available"
    fi
    
    # Check Node.js version
    local node_version
    node_version=$(node --version 2>/dev/null || echo "unknown")
    log_info "Node.js version: $node_version"
    
    # Check npm version
    local npm_version
    npm_version=$(npm --version 2>/dev/null || echo "unknown")
    log_info "npm version: $npm_version"
}

# Start development server
start_development() {
    log_info "Starting development environment..."
    
    # Clean previous build artifacts
    log_info "Cleaning build artifacts..."
    npm run clean >/dev/null 2>&1 || log_warn "Clean command failed or not available"
    
    # Install/update dependencies if needed
    if [[ ! -d "node_modules" ]] || [[ "package.json" -nt "node_modules" ]]; then
        log_info "Installing/updating dependencies..."
        npm install --silent
    fi
    
    # Start development server in background
    log_info "Launching development server..."
    npm run dev > "$LOG_DIR/dev-output.log" 2>&1 &
    local dev_pid=$!
    echo $dev_pid > "$PID_FILE"
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    local wait_count=0
    while [[ $wait_count -lt $TIMEOUT_SECONDS ]]; do
        if curl -s "http://localhost:19858" >/dev/null 2>&1; then
            log_success "Development server is ready at http://localhost:19858"
            return 0
        fi
        
        # Check if process is still running
        if ! kill -0 $dev_pid 2>/dev/null; then
            log_error "Development process died unexpectedly"
            cat "$LOG_DIR/dev-output.log" | tail -20
            return 1
        fi
        
        sleep 1
        ((wait_count++))
        
        # Show progress
        if [[ $((wait_count % 5)) -eq 0 ]]; then
            log_info "Still waiting... ($wait_count/${TIMEOUT_SECONDS}s)"
        fi
    done
    
    log_error "Development server failed to start within ${TIMEOUT_SECONDS} seconds"
    return 1
}

# Main execution
main() {
    local start_time
    start_time=$(date +%s)
    
    log_info "========================================="
    log_info "Article Saver Desktop Restart Script"
    log_info "Started at $(date)"
    log_info "========================================="
    
    # Set up error handling
    trap 'handle_error $LINENO' ERR
    trap cleanup EXIT
    
    # Execute main steps
    setup
    health_check
    stop_processes
    start_development
    
    local end_time duration
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    log_success "========================================="
    log_success "Restart completed successfully!"
    log_success "Duration: ${duration} seconds"
    log_success "Development server: http://localhost:19858"
    log_success "Log file: $LOG_FILE"
    log_success "========================================="
    
    # Show live logs
    echo
    log_info "Showing live development logs (Ctrl+C to stop):"
    tail -f "$LOG_DIR/dev-output.log" 2>/dev/null || true
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi