#!/bin/bash
# Enterprise NPM Installation Handler V2 - Optimized for GitHub Actions
# Implements memory-efficient installation with proper error handling

set -euo pipefail

# Configuration
MAX_RETRIES=3
MEMORY_LIMIT_MB=2048  # Conservative memory limit
LOG_FILE="npm-install-$(date +%s).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Memory management functions
get_available_memory_mb() {
    free -m | awk '/^Mem:/ {print $7}'
}

clear_system_caches() {
    log_info "Clearing system caches..."
    sync
    echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null
    sleep 2
}

monitor_memory() {
    local available=$(get_available_memory_mb)
    log_debug "Available memory: ${available}MB"
    
    if [ "$available" -lt 1024 ]; then
        log_warn "Low memory detected (${available}MB available)"
        clear_system_caches
        available=$(get_available_memory_mb)
        log_debug "After cache clear: ${available}MB available"
    fi
}

# NPM configuration for memory efficiency
configure_npm_for_ci() {
    log_info "Configuring NPM for CI environment..."
    
    # Disable all non-essential features
    npm config set audit false
    npm config set fund false
    npm config set progress false
    npm config set update-notifier false
    npm config set loglevel warn
    
    # Memory-saving configurations
    npm config set prefer-offline true
    npm config set cache-min 86400
    npm config set maxsockets 3
    npm config set jobs 2
    
    # Disable optional dependencies
    npm config set optional false
    npm config set save-optional false
    
    # Set conservative timeouts
    npm config set fetch-timeout 300000
    npm config set fetch-retries 3
    npm config set fetch-retry-mintimeout 20000
    npm config set fetch-retry-maxtimeout 120000
}

# Install dependencies for a single workspace
install_workspace() {
    local workspace="$1"
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_info "Installing $workspace dependencies (attempt $attempt/$MAX_RETRIES)"
        
        # Monitor memory before installation
        monitor_memory
        
        # Calculate safe memory limit
        local available_mb=$(get_available_memory_mb)
        local node_mem=$(( available_mb > $MEMORY_LIMIT_MB ? $MEMORY_LIMIT_MB : available_mb * 7 / 10 ))
        
        log_debug "Setting Node.js memory limit to ${node_mem}MB"
        export NODE_OPTIONS="--max-old-space-size=${node_mem}"
        
        # Change to workspace directory
        if [ "$workspace" != "root" ]; then
            cd "$workspace"
        fi
        
        # Run npm install with optimizations
        local install_cmd="npm ci --no-audit --no-fund --prefer-offline"
        
        # If npm ci fails, fall back to npm install
        if ! $install_cmd 2>&1 | tee -a "$LOG_FILE"; then
            log_warn "npm ci failed, trying npm install..."
            install_cmd="npm install --no-audit --no-fund --prefer-offline"
            
            if ! $install_cmd 2>&1 | tee -a "$LOG_FILE"; then
                exit_code=$?
                log_error "Installation failed with exit code $exit_code"
                
                # Check for specific error patterns
                if grep -q "ENOMEM\|JavaScript heap out of memory" "$LOG_FILE"; then
                    log_error "Out of memory error detected"
                    clear_system_caches
                    node_mem=$(( node_mem * 3 / 4 ))  # Reduce memory for next attempt
                fi
                
                if [ "$workspace" != "root" ]; then
                    cd ..
                fi
                
                attempt=$((attempt + 1))
                if [ $attempt -le $MAX_RETRIES ]; then
                    log_info "Waiting 5 seconds before retry..."
                    sleep 5
                fi
                continue
            fi
        fi
        
        # Return to root directory
        if [ "$workspace" != "root" ]; then
            cd ..
        fi
        
        # Verify installation
        local node_modules_path="$workspace/node_modules"
        if [ "$workspace" = "root" ]; then
            node_modules_path="node_modules"
        fi
        
        if [ -d "$node_modules_path" ]; then
            log_info "Successfully installed $workspace dependencies"
            
            # Clear memory after successful installation
            clear_system_caches
            return 0
        else
            log_error "node_modules not found after installation"
            attempt=$((attempt + 1))
        fi
    done
    
    return 1
}

# Main installation process
main() {
    log_info "Starting optimized NPM installation handler"
    
    # System information
    log_info "System information:"
    free -h | tee -a "$LOG_FILE"
    df -h / | tee -a "$LOG_FILE"
    
    # Configure NPM
    configure_npm_for_ci
    
    # Clear any stale locks
    rm -f ~/.npm/_locks/* 2>/dev/null || true
    
    # Check if we're using workspaces
    if [ -f "package.json" ] && grep -q '"workspaces"' package.json; then
        log_info "Detected NPM workspaces configuration"
        
        # Install workspaces sequentially to avoid memory spikes
        log_info "Installing root dependencies..."
        if ! install_workspace "root"; then
            log_error "Failed to install root dependencies"
            exit 1
        fi
        
        # Install each workspace
        for workspace in backend desktop shared; do
            if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
                if ! install_workspace "$workspace"; then
                    log_error "Failed to install $workspace dependencies"
                    exit 1
                fi
            fi
        done
    else
        # Non-workspace installation
        log_info "Standard (non-workspace) installation"
        if ! install_workspace "root"; then
            log_error "Failed to install dependencies"
            exit 1
        fi
    fi
    
    # Final validation
    log_info "Validating installation..."
    local validation_failed=false
    
    if [ ! -d "node_modules" ]; then
        log_error "Root node_modules missing"
        validation_failed=true
    fi
    
    for workspace in backend desktop shared; do
        if [ -d "$workspace" ] && [ -f "$workspace/package.json" ] && [ ! -d "$workspace/node_modules" ]; then
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
    free -h | tee -a "$LOG_FILE"
    
    # Archive log file
    if [ -f "$LOG_FILE" ]; then
        gzip "$LOG_FILE"
    fi
}

# Execute main function
main "$@"