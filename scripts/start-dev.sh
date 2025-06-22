#!/bin/bash

# ================================================================
# ENTERPRISE-GRADE DEVELOPMENT STARTUP SCRIPT FOR ARTICLE SAVER
# ================================================================
# This script provides the most standard, correct, and perfect
# solution for starting the development environment
# ================================================================

set -e  # Exit on error
set -u  # Exit on undefined variables

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3003
DESKTOP_PORT=19858
DB_NAME="article_saver"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT=5432

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ================================================================
# FUNCTIONS
# ================================================================

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    else
        print_success "$1 is installed"
        return 0
    fi
}

check_postgresql() {
    if pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
        print_success "PostgreSQL is running on port $DB_PORT"
        return 0
    else
        print_error "PostgreSQL is not running"
        return 1
    fi
}

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port $1 is already in use"
        return 1
    else
        print_success "Port $1 is available"
        return 0
    fi
}

verify_env_file() {
    local env_file="$1"
    local env_example="$2"
    
    if [ ! -f "$env_file" ]; then
        print_warning ".env file not found at $env_file"
        if [ -f "$env_example" ]; then
            print_info "Creating .env from .env.example"
            cp "$env_example" "$env_file"
            print_warning "Please update $env_file with your actual values"
            return 1
        else
            print_error ".env.example not found at $env_example"
            return 1
        fi
    else
        print_success ".env file exists at $env_file"
        return 0
    fi
}

kill_port_process() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        print_warning "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

setup_database() {
    print_header "DATABASE SETUP"
    
    # Check if database exists
    if psql -h $DB_HOST -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        print_success "Database '$DB_NAME' exists"
    else
        print_warning "Database '$DB_NAME' does not exist"
        print_info "Creating database..."
        createdb -h $DB_HOST -U $DB_USER $DB_NAME 2>/dev/null || {
            print_error "Failed to create database. Please create it manually:"
            echo "createdb $DB_NAME"
            return 1
        }
        print_success "Database created successfully"
    fi
    
    # Run Prisma setup
    cd "$ROOT_DIR/backend"
    print_info "Running Prisma database setup..."
    
    # Generate Prisma client
    npm run db:generate > /dev/null 2>&1 || {
        print_error "Failed to generate Prisma client"
        return 1
    }
    print_success "Prisma client generated"
    
    # Push schema to database
    npm run db:push > /dev/null 2>&1 || {
        print_error "Failed to push schema to database"
        return 1
    }
    print_success "Database schema updated"
    
    cd "$ROOT_DIR"
    return 0
}

# ================================================================
# MAIN SCRIPT
# ================================================================

clear

echo -e "${CYAN}"
echo "    _         _   _      _        ____                      "
echo "   / \   _ __| |_(_) ___| | ___  / ___|  __ ___   _____ _ __ "
echo "  / _ \ | '__| __| |/ __| |/ _ \ \___ \ / _\` \ \ / / _ \ '__|"
echo " / ___ \| |  | |_| | (__| |  __/  ___) | (_| |\ V /  __/ |   "
echo "/_/   \_\_|   \__|_|\___|_|\___| |____/ \__,_| \_/ \___|_|   "
echo -e "${NC}"
echo -e "${PURPLE}Enterprise Development Environment Startup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Step 1: Prerequisites Check
print_header "STEP 1: CHECKING PREREQUISITES"

prerequisites_ok=true

check_command "node" || prerequisites_ok=false
check_command "npm" || prerequisites_ok=false
# PostgreSQL check - handle different installation paths
if command -v psql &> /dev/null; then
    print_success "psql is installed"
elif [ -f "/opt/homebrew/opt/postgresql@16/bin/psql" ]; then
    print_success "psql is installed (PostgreSQL 16 via Homebrew)"
    export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
elif [ -f "/usr/local/opt/postgresql@16/bin/psql" ]; then
    print_success "psql is installed (PostgreSQL 16 via Homebrew)"
    export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
elif [ -f "/opt/homebrew/opt/postgresql@14/bin/psql" ]; then
    print_success "psql is installed (PostgreSQL 14 via Homebrew)"
    export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
else
    print_error "psql is not installed"
    prerequisites_ok=false
fi

if command -v pg_isready &> /dev/null; then
    print_success "pg_isready is installed"
elif [ -f "/opt/homebrew/opt/postgresql@16/bin/pg_isready" ]; then
    print_success "pg_isready is installed (PostgreSQL 16 via Homebrew)"
    export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
elif [ -f "/usr/local/opt/postgresql@16/bin/pg_isready" ]; then
    print_success "pg_isready is installed (PostgreSQL 16 via Homebrew)"
    export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
elif [ -f "/opt/homebrew/opt/postgresql@14/bin/pg_isready" ]; then
    print_success "pg_isready is installed (PostgreSQL 14 via Homebrew)"
    export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
else
    print_error "pg_isready is not installed"
    prerequisites_ok=false
fi
check_command "git" || prerequisites_ok=false

if [ "$prerequisites_ok" = false ]; then
    print_error "Missing prerequisites. Please install required software."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
else
    print_success "Node.js version: $(node -v)"
fi

# Step 2: Environment Setup
print_header "STEP 2: ENVIRONMENT CONFIGURATION"

# Check backend .env
backend_env_ok=true
if ! verify_env_file "$ROOT_DIR/backend/.env" "$ROOT_DIR/backend/.env.example"; then
    backend_env_ok=false
fi

# Check desktop .env (optional)
if [ ! -f "$ROOT_DIR/desktop/.env" ]; then
    echo "VITE_API_URL=http://localhost:$BACKEND_PORT" > "$ROOT_DIR/desktop/.env"
    print_success "Created desktop .env file"
fi

if [ "$backend_env_ok" = false ]; then
    print_error "Please configure backend/.env file before continuing"
    exit 1
fi

# Step 3: Port Availability
print_header "STEP 3: CHECKING PORT AVAILABILITY"

port_issues=false
if ! check_port $BACKEND_PORT; then
    print_info "Would you like to kill the process on port $BACKEND_PORT? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        kill_port_process $BACKEND_PORT
        check_port $BACKEND_PORT || port_issues=true
    else
        port_issues=true
    fi
fi

if ! check_port $DESKTOP_PORT; then
    print_info "Would you like to kill the process on port $DESKTOP_PORT? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        kill_port_process $DESKTOP_PORT
        check_port $DESKTOP_PORT || port_issues=true
    else
        port_issues=true
    fi
fi

if [ "$port_issues" = true ]; then
    print_error "Port conflicts detected. Please resolve before continuing."
    exit 1
fi

# Step 4: PostgreSQL Check
print_header "STEP 4: DATABASE CHECK"

if ! check_postgresql; then
    print_info "Attempting to start PostgreSQL..."
    
    # Try different PostgreSQL startup methods
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || true
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql 2>/dev/null || true
    elif command -v service &> /dev/null; then
        sudo service postgresql start 2>/dev/null || true
    fi
    
    sleep 3
    
    if ! check_postgresql; then
        print_error "Failed to start PostgreSQL. Please start it manually."
        exit 1
    fi
fi

# Step 5: Dependencies Check
print_header "STEP 5: CHECKING DEPENDENCIES"

print_info "Checking backend dependencies..."
cd "$ROOT_DIR/backend"
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    print_warning "Backend dependencies not installed"
    print_info "Installing backend dependencies..."
    npm install || {
        print_error "Failed to install backend dependencies"
        exit 1
    }
fi
print_success "Backend dependencies OK"

print_info "Checking desktop dependencies..."
cd "$ROOT_DIR/desktop"
if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
    print_warning "Desktop dependencies not installed"
    print_info "Installing desktop dependencies..."
    npm install || {
        print_error "Failed to install desktop dependencies"
        exit 1
    }
fi
print_success "Desktop dependencies OK"

cd "$ROOT_DIR"

# Step 6: Database Setup
if ! setup_database; then
    print_error "Database setup failed"
    exit 1
fi

# Step 7: Start Services
print_header "STEP 6: STARTING DEVELOPMENT SERVERS"

# Create logs directory
mkdir -p "$ROOT_DIR/logs"

# Function to cleanup on exit
cleanup() {
    print_warning "\nShutting down services..."
    if [ ! -z "${BACKEND_PID:-}" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "${DESKTOP_PID:-}" ]; then
        kill $DESKTOP_PID 2>/dev/null || true
    fi
    exit 0
}

trap cleanup EXIT INT TERM

# Start backend
print_info "Starting backend server..."
cd "$ROOT_DIR/backend"
npm run dev > "$ROOT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null; then
        print_success "Backend server started on port $BACKEND_PORT"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Backend failed to start. Check logs/backend.log"
        exit 1
    fi
    sleep 1
done

# Start desktop
print_info "Starting desktop application..."
cd "$ROOT_DIR/desktop"
npm run dev > "$ROOT_DIR/logs/desktop.log" 2>&1 &
DESKTOP_PID=$!

# Wait for desktop to start
for i in {1..30}; do
    if curl -s http://localhost:$DESKTOP_PORT > /dev/null; then
        print_success "Desktop application started on port $DESKTOP_PORT"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Desktop failed to start. Check logs/desktop.log"
        exit 1
    fi
    sleep 1
done

# Final Status
print_header "✨ DEVELOPMENT ENVIRONMENT READY!"

echo -e "${GREEN}Services Running:${NC}"
echo -e "  ${CYAN}Backend API:${NC}     http://localhost:$BACKEND_PORT"
echo -e "  ${CYAN}Desktop App:${NC}     http://localhost:$DESKTOP_PORT"
echo -e "  ${CYAN}API Health:${NC}      http://localhost:$BACKEND_PORT/api/health"
echo -e "  ${CYAN}Prisma Studio:${NC}   Run 'cd backend && npm run db:studio'"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Backend: $ROOT_DIR/logs/backend.log"
echo -e "  Desktop: $ROOT_DIR/logs/desktop.log"
echo ""
echo -e "${PURPLE}Press Ctrl+C to stop all services${NC}"

# Keep script running
wait