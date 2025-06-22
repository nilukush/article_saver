#!/bin/bash

# ================================================================
# ENTERPRISE DEVELOPMENT STOP SCRIPT FOR ARTICLE SAVER
# ================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3003
DESKTOP_PORT=19858

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STOPPING ARTICLE SAVER DEVELOPMENT ENVIRONMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to kill process on port
kill_port() {
    local port=$1
    local service=$2
    
    printf "%-30s" "Stopping $service (port $port):"
    
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        kill -9 $pids 2>/dev/null || true
        echo -e "${GREEN}✅ STOPPED${NC} (PID: $pids)"
    else
        echo -e "${YELLOW}⚠️  NOT RUNNING${NC}"
    fi
}

# Stop services
echo -e "${YELLOW}Stopping Services:${NC}"
kill_port $BACKEND_PORT "Backend API"
kill_port $DESKTOP_PORT "Desktop App"

# Kill any lingering Node processes related to the project
echo ""
echo -e "${YELLOW}Cleaning up Node processes:${NC}"
ps aux | grep -E "(nodemon|vite|electron|tsx)" | grep -v grep | awk '{print $2}' | while read pid; do
    if [ ! -z "$pid" ]; then
        kill -9 $pid 2>/dev/null || true
        echo -e "${GREEN}✅ Killed process${NC} (PID: $pid)"
    fi
done

echo ""
echo -e "${GREEN}✨ All services stopped successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"