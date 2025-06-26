#!/bin/bash
# Enterprise NPM Installation Handler for GitHub Actions
# Handles exit code 143 and other memory-related failures

set -e

# Configuration
MAX_RETRIES=3
MEMORY_THRESHOLD=80  # Percentage of memory usage to trigger cleanup
LOG_FILE="/tmp/npm-install-$(date +%s).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Function to check system resources
check_resources() {
    local mem_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    local disk_usage=$(df / | tail -1 | awk '{print int($5)}')
    
    log "System resources - Memory: ${mem_usage}%, Disk: ${disk_usage}%"
    
    if [ "$mem_usage" -gt "$MEMORY_THRESHOLD" ]; then
        log_warning "High memory usage detected: ${mem_usage}%"
        return 1
    fi
    
    if [ "$disk_usage" -gt 90 ]; then
        log_warning "High disk usage detected: ${disk_usage}%"
        return 1
    fi
    
    return 0
}

# Function to clean system resources
clean_resources() {
    log "Cleaning system resources..."
    
    # Clear system caches
    if [ -w /proc/sys/vm/drop_caches ]; then
        sync && echo 3 | sudo tee /proc/sys/vm/drop_caches >/dev/null
        log "System caches cleared"
    fi
    
    # Clean npm cache
    npm cache clean --force 2>/dev/null || true
    
    # Remove temporary files
    find /tmp -type f -name "npm-*" -mtime +1 -delete 2>/dev/null || true
    
    # Show resource status after cleanup
    free -h
    df -h /
}

# Function to validate installation
validate_installation() {
    local success=true
    
    log "Validating installation..."
    
    # Check root node_modules
    if [ ! -d "node_modules" ]; then
        log_error "Missing root node_modules"
        success=false
    fi
    
    # Check workspace node_modules
    for workspace in backend desktop shared; do
        if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
            if [ ! -d "$workspace/node_modules" ]; then
                log_error "Missing node_modules in $workspace"
                success=false
            fi
        fi
    done
    
    if [ "$success" = true ]; then
        log_success "Installation validation passed"
        return 0
    else
        log_error "Installation validation failed"
        return 1
    fi
}

# Function to perform workspace-aware installation
install_workspace_aware() {
    log "Attempting workspace-aware installation..."
    
    # Set timeout for npm command
    timeout 900s npm ci \
        --no-audit \
        --no-fund \
        --prefer-offline \
        --ignore-scripts \
        2>&1 | tee -a "$LOG_FILE"
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        log_success "Workspace-aware installation succeeded"
        return 0
    elif [ $exit_code -eq 143 ]; then
        log_error "Installation terminated (SIGTERM) - likely timeout or memory issue"
        return 143
    else
        log_error "Workspace-aware installation failed with exit code: $exit_code"
        return $exit_code
    fi
}

# Function to perform sequential installation
install_sequential() {
    log "Attempting sequential installation..."
    
    # Install root dependencies first
    log "Installing root dependencies..."
    timeout 300s npm install \
        --no-workspaces \
        --no-audit \
        --no-fund \
        --legacy-peer-deps \
        --ignore-scripts \
        2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "Root installation failed"
        return 1
    fi
    
    # Install each workspace
    for workspace in backend desktop shared; do
        if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
            log "Installing $workspace dependencies..."
            
            (cd "$workspace" && timeout 300s npm install \
                --no-audit \
                --no-fund \
                --legacy-peer-deps \
                --ignore-scripts \
                2>&1 | tee -a "$LOG_FILE")
            
            if [ ${PIPESTATUS[0]} -ne 0 ]; then
                log_error "Failed to install $workspace dependencies"
                return 1
            fi
            
            # Clean resources between installations
            clean_resources
        fi
    done
    
    log_success "Sequential installation completed"
    return 0
}

# Function to run postinstall scripts
run_postinstall() {
    log "Running postinstall scripts..."
    
    # Run root postinstall
    if npm run --if-present postinstall 2>&1 | tee -a "$LOG_FILE"; then
        log "Root postinstall completed"
    else
        log_warning "Root postinstall failed (non-critical)"
    fi
    
    # Run workspace postinstalls
    for workspace in backend desktop shared; do
        if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
            (cd "$workspace" && npm run --if-present postinstall 2>&1 | tee -a "$LOG_FILE") || true
        fi
    done
}

# Main installation logic
main() {
    log "Starting NPM installation handler"
    log "Node version: $(node --version)"
    log "NPM version: $(npm --version)"
    log "Working directory: $(pwd)"
    
    # Initial resource check
    check_resources
    
    # Monitor resources in background
    (while true; do
        echo "[$(date '+%H:%M:%S')] Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')" >> "$LOG_FILE"
        sleep 30
    done) &
    MONITOR_PID=$!
    
    # Cleanup function
    cleanup() {
        kill $MONITOR_PID 2>/dev/null || true
        log "Installation handler completed"
    }
    trap cleanup EXIT
    
    # Try installation methods
    local attempt=0
    local success=false
    
    while [ $attempt -lt $MAX_RETRIES ] && [ "$success" = false ]; do
        attempt=$((attempt + 1))
        log "Installation attempt $attempt of $MAX_RETRIES"
        
        # Check and clean resources if needed
        if ! check_resources; then
            clean_resources
        fi
        
        # Try workspace-aware installation first
        if install_workspace_aware; then
            success=true
        else
            log_warning "Workspace-aware installation failed, trying sequential method..."
            
            # Clean up before retry
            rm -rf node_modules */node_modules
            clean_resources
            
            # Try sequential installation
            if install_sequential; then
                success=true
            else
                log_error "Sequential installation also failed"
                
                if [ $attempt -lt $MAX_RETRIES ]; then
                    log "Waiting before retry..."
                    sleep $((attempt * 10))
                fi
            fi
        fi
    done
    
    if [ "$success" = false ]; then
        log_error "All installation attempts failed"
        exit 1
    fi
    
    # Run postinstall scripts
    run_postinstall
    
    # Validate installation
    if validate_installation; then
        log_success "NPM installation completed successfully!"
        exit 0
    else
        log_error "Installation validation failed"
        exit 1
    fi
}

# Run main function
main "$@"