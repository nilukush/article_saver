#!/bin/bash
# Enterprise NPM Installation Handler for CI/CD
# Handles memory constraints, exit codes, and provides robust installation

set -euo pipefail

# Configuration
MAX_RETRIES=3
MEMORY_THRESHOLD=80  # Percentage
EXIT_CODE_WARNINGS=1  # npm warnings exit code

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check memory usage
check_memory() {
    local mem_percent=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    local swap_percent=$(free | grep Swap | awk '{if ($2 > 0) print int($3/$2 * 100); else print 0}')
    
    log_info "Memory usage: RAM ${mem_percent}%, Swap ${swap_percent}%"
    
    if [ "$mem_percent" -gt "$MEMORY_THRESHOLD" ]; then
        log_warn "High memory usage detected"
        return 1
    fi
    return 0
}

# Clear system caches
clear_caches() {
    log_info "Clearing system caches..."
    sync
    if [ -w /proc/sys/vm/drop_caches ]; then
        echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null
        sleep 2
    fi
}

# NPM install with retry logic
npm_install_with_retry() {
    local workspace="$1"
    local attempt=1
    local exit_code=0
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_info "Installing dependencies for $workspace (attempt $attempt/$MAX_RETRIES)"
        
        # Check memory before install
        if ! check_memory; then
            clear_caches
        fi
        
        # Configure Node.js memory based on available RAM
        local available_mb=$(free -m | grep Mem | awk '{print int($7 * 0.7)}')
        local node_mem=$(( available_mb < 4096 ? available_mb : 4096 ))
        
        log_info "Setting Node.js max memory to ${node_mem}MB"
        export NODE_OPTIONS="--max-old-space-size=${node_mem}"
        
        # Run npm install
        if [ "$workspace" != "root" ]; then
            cd "$workspace"
        fi
        
        npm install \
            --no-audit \
            --no-fund \
            --prefer-offline \
            --maxsockets=5 \
            --fetch-retries=3 \
            --fetch-retry-mintimeout=20000 \
            --fetch-retry-maxtimeout=120000 \
            2>&1 | tee npm-install.log
        
        exit_code=${PIPESTATUS[0]}
        
        if [ "$workspace" != "root" ]; then
            cd ..
        fi
        
        # Analyze exit code
        case $exit_code in
            0)
                log_info "Installation successful for $workspace"
                return 0
                ;;
            1)
                log_warn "Installation completed with warnings for $workspace (exit code 1)"
                # Check if node_modules exists
                if [ -d "${workspace}/node_modules" ] || [ "$workspace" = "root" -a -d "node_modules" ]; then
                    log_info "node_modules exists, treating as success"
                    return 0
                else
                    log_error "node_modules missing despite exit code 1"
                fi
                ;;
            137)
                log_error "Process killed by OOM killer (exit code 137)"
                clear_caches
                ;;
            143)
                log_error "Process terminated with SIGTERM (exit code 143)"
                clear_caches
                ;;
            *)
                log_error "Installation failed with exit code $exit_code"
                ;;
        esac
        
        # Check for specific error patterns
        if grep -q "ENOMEM\|ENOSPC\|JavaScript heap out of memory" npm-install.log; then
            log_error "Memory-related error detected"
            clear_caches
            # Reduce memory allocation for next attempt
            node_mem=$(( node_mem * 3 / 4 ))
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -le $MAX_RETRIES ]; then
            log_info "Waiting before retry..."
            sleep $((attempt * 5))
        fi
    done
    
    return 1
}

# Main installation process
main() {
    log_info "Starting enterprise npm installation handler"
    
    # System info
    log_info "System information:"
    free -h || true
    df -h / || true
    
    # Configure npm for CI
    log_info "Configuring npm for CI environment"
    npm config set audit false
    npm config set fund false
    npm config set progress false
    npm config set update-notifier false
    
    # Clear npm locks
    rm -f ~/.npm/_locks/* 2>/dev/null || true
    
    # Install root dependencies
    if ! npm_install_with_retry "root"; then
        log_error "Failed to install root dependencies"
        exit 1
    fi
    
    # Check for install:all script
    if npm run | grep -q "install:all"; then
        log_info "Using npm run install:all"
        npm run install:all || {
            exit_code=$?
            if [ $exit_code -eq 1 ]; then
                log_warn "install:all exited with code 1, checking workspaces..."
                # Verify workspaces are installed
                for workspace in backend desktop; do
                    if [ ! -d "$workspace/node_modules" ]; then
                        log_error "$workspace/node_modules missing"
                        npm_install_with_retry "$workspace"
                    fi
                done
            else
                log_error "install:all failed with exit code $exit_code"
                exit 1
            fi
        }
    else
        # Install workspaces individually
        for workspace in backend desktop; do
            if [ -d "$workspace" ]; then
                if ! npm_install_with_retry "$workspace"; then
                    log_error "Failed to install $workspace dependencies"
                    exit 1
                fi
            fi
        done
    fi
    
    # Validation
    log_info "Validating installation..."
    validation_failed=false
    
    if [ ! -d "node_modules" ]; then
        log_error "Root node_modules missing"
        validation_failed=true
    fi
    
    for workspace in backend desktop; do
        if [ -d "$workspace" ] && [ ! -d "$workspace/node_modules" ]; then
            log_error "$workspace/node_modules missing"
            validation_failed=true
        fi
    done
    
    if [ "$validation_failed" = true ]; then
        log_error "Installation validation failed"
        exit 1
    fi
    
    log_info "Installation completed successfully"
    
    # Final system state
    log_info "Final system state:"
    free -h || true
    df -h / || true
}

# Run main function
main "$@"