#!/bin/bash

# ================================================================
# ENTERPRISE HEALTH CHECK SCRIPT FOR ARTICLE SAVER
# ================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_URL="http://localhost:3003"
DESKTOP_URL="http://localhost:19858"
DB_NAME="article_saver"
DB_USER="postgres"
DB_HOST="localhost"

# Health check functions
check_service() {
    local name=$1
    local url=$2
    local expected_response=$3
    
    printf "%-30s" "$name:"
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null); then
        if [ "$response" = "$expected_response" ]; then
            echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
            return 0
        else
            echo -e "${YELLOW}⚠️  WARNING${NC} (HTTP $response)"
            return 1
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (Connection error)"
        return 1
    fi
}

check_database() {
    printf "%-30s" "PostgreSQL Database:"
    
    if pg_isready -h $DB_HOST -q 2>/dev/null; then
        echo -e "${GREEN}✅ OK${NC}"
        
        # Check if we can connect to the specific database
        printf "%-30s" "Database '$DB_NAME':"
        if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ OK${NC}"
        else
            echo -e "${RED}❌ FAILED${NC} (Cannot connect)"
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (PostgreSQL not running)"
    fi
}

check_ports() {
    local port=$1
    local service=$2
    
    printf "%-30s" "$service (port $port):"
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC} (Port in use)"
    else
        echo -e "${RED}❌ FAILED${NC} (Port not listening)"
    fi
}

# Main health check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}ARTICLE SAVER HEALTH CHECK${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check services
echo -e "${YELLOW}Services:${NC}"
check_service "Backend API" "$BACKEND_URL/api/health" "200"
check_service "Desktop App" "$DESKTOP_URL" "200"
echo ""

# Check ports
echo -e "${YELLOW}Port Status:${NC}"
check_ports 3003 "Backend API"
check_ports 19858 "Desktop App"
check_ports 5432 "PostgreSQL"
echo ""

# Check database
echo -e "${YELLOW}Database:${NC}"
check_database
echo ""

# Check API endpoints
echo -e "${YELLOW}API Endpoints:${NC}"
check_service "Auth Endpoint" "$BACKEND_URL/api/auth/status" "401"
check_service "Articles Endpoint" "$BACKEND_URL/api/articles" "401"
echo ""

# System resources
echo -e "${YELLOW}System Resources:${NC}"
printf "%-30s" "Memory Usage:"
if command -v free > /dev/null 2>&1; then
    mem_usage=$(free -m | awk 'NR==2{printf "%.0f%%", $3*100/$2}')
    echo -e "${GREEN}$mem_usage${NC}"
else
    # macOS
    mem_usage=$(ps -A -o %mem | awk '{s+=$1} END {print s "%"}')
    echo -e "${GREEN}$mem_usage${NC}"
fi

printf "%-30s" "Disk Usage:"
disk_usage=$(df -h / | awk 'NR==2{print $5}')
echo -e "${GREEN}$disk_usage${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"