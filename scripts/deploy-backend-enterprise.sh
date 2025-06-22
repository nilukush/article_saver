#!/bin/bash
# Enterprise-Grade Backend Deployment Script for Railway
# Handles complex passwords with special characters using industry best practices

set -e

echo "🚂 Article Saver Enterprise Backend Deployment"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to URL encode a string
urlencode() {
    local string="${1}"
    local strlen=${#string}
    local encoded=""
    local pos c o

    for (( pos=0 ; pos<strlen ; pos++ )); do
        c=${string:$pos:1}
        case "$c" in
            [-_.~a-zA-Z0-9] ) o="${c}" ;;
            * ) printf -v o '%%%02x' "'$c"
        esac
        encoded+="${o}"
    done
    echo "${encoded}"
}

# Function to validate PostgreSQL connection string
validate_postgresql_url() {
    local url="$1"
    if [[ ! "$url" =~ ^postgresql:// ]]; then
        echo -e "${RED}Error: URL must start with postgresql://${NC}"
        return 1
    fi
    return 0
}

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
        npm install -g @railway/cli
    fi
    
    # Check if we're in the right directory
    if [ ! -f "backend/package.json" ]; then
        echo -e "${RED}Error: Please run this script from the project root directory${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Prerequisites checked${NC}"
}

# Main deployment function
deploy_backend() {
    # Navigate to backend directory
    cd backend
    
    # Check if Railway project is already initialized
    if [ ! -f ".railway/config.json" ]; then
        echo ""
        echo "🚀 Initializing Railway project..."
        railway init
    else
        echo -e "${GREEN}✓ Railway project already initialized${NC}"
    fi
    
    echo ""
    echo "🔧 Database Configuration"
    echo "========================"
    echo ""
    echo -e "${BLUE}Enter your Supabase connection details:${NC}"
    echo ""
    
    # Get database components
    read -p "Database Host (e.g., db.lhgzhnksmjlkcceluuar.supabase.co): " DB_HOST
    read -p "Database Port (default 5432): " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    read -p "Database Name (default postgres): " DB_NAME
    DB_NAME=${DB_NAME:-postgres}
    read -p "Database User (default postgres): " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    # Get password securely
    echo -n "Database Password: "
    read -s DB_PASSWORD
    echo ""
    
    # URL encode the password
    ENCODED_PASSWORD=$(urlencode "$DB_PASSWORD")
    
    # Construct the connection string
    DATABASE_URL="postgresql://${DB_USER}:${ENCODED_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
    
    echo ""
    echo -e "${GREEN}✓ Connection string constructed with URL-encoded password${NC}"
    
    # Set environment variables using Railway CLI
    echo ""
    echo "📝 Setting Railway environment variables..."
    
    # Create temporary files for secure variable setting
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    
    # Set DATABASE_URL
    echo -n "$DATABASE_URL" > "$TEMP_DIR/database_url"
    if cat "$TEMP_DIR/database_url" | railway variables set DATABASE_URL; then
        echo -e "${GREEN}✓ DATABASE_URL set successfully${NC}"
    else
        echo -e "${RED}✗ Failed to set DATABASE_URL${NC}"
        exit 1
    fi
    
    # Generate and set JWT_SECRET
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    echo -n "$JWT_SECRET" > "$TEMP_DIR/jwt_secret"
    if echo "$JWT_SECRET" | railway variables set JWT_SECRET; then
        echo -e "${GREEN}✓ JWT_SECRET generated and set${NC}"
    else
        echo -e "${RED}✗ Failed to set JWT_SECRET${NC}"
        exit 1
    fi
    
    # Set other environment variables
    echo "production" | railway variables set NODE_ENV
    echo "3003" | railway variables set PORT
    echo "info" | railway variables set LOG_LEVEL
    
    echo ""
    echo -e "${GREEN}✓ All core environment variables configured${NC}"
    
    # Optional OAuth setup
    echo ""
    read -p "Configure OAuth providers? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        configure_oauth
    fi
    
    # Deploy to Railway
    echo ""
    echo "🚀 Deploying to Railway..."
    railway up
    
    # Get deployment information
    echo ""
    echo "⏳ Waiting for deployment to complete..."
    sleep 15
    
    # Show deployment status
    echo ""
    echo "📊 Deployment Status:"
    railway status
    
    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo "📝 Next steps:"
    echo "1. Run 'railway open' to view your project dashboard"
    echo "2. Run 'railway logs' to view deployment logs"
    echo "3. Update your desktop app with the Railway URL"
    
    # Return to root directory
    cd ..
}

# OAuth configuration function
configure_oauth() {
    echo ""
    echo "🔐 OAuth Configuration"
    echo "====================="
    
    # Google OAuth
    echo ""
    echo "Google OAuth (press Enter to skip):"
    read -p "GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
    if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
        echo "$GOOGLE_CLIENT_ID" | railway variables set GOOGLE_CLIENT_ID
        read -p "GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
        if [ ! -z "$GOOGLE_CLIENT_SECRET" ]; then
            echo "$GOOGLE_CLIENT_SECRET" | railway variables set GOOGLE_CLIENT_SECRET
        fi
    fi
    
    # GitHub OAuth
    echo ""
    echo "GitHub OAuth (press Enter to skip):"
    read -p "GITHUB_CLIENT_ID: " GITHUB_CLIENT_ID
    if [ ! -z "$GITHUB_CLIENT_ID" ]; then
        echo "$GITHUB_CLIENT_ID" | railway variables set GITHUB_CLIENT_ID
        read -p "GITHUB_CLIENT_SECRET: " GITHUB_CLIENT_SECRET
        if [ ! -z "$GITHUB_CLIENT_SECRET" ]; then
            echo "$GITHUB_CLIENT_SECRET" | railway variables set GITHUB_CLIENT_SECRET
        fi
    fi
}

# Display connection string info
show_connection_info() {
    echo ""
    echo "📚 PostgreSQL Connection String Best Practices:"
    echo "=============================================="
    echo ""
    echo "1. Special characters in passwords are URL-encoded automatically"
    echo "2. Common encodings:"
    echo "   @ → %40"
    echo "   # → %23"
    echo "   $ → %24"
    echo "   & → %26"
    echo "   * → %2A"
    echo "   ! → %21"
    echo "   Space → %20"
    echo ""
    echo "3. Your password has been securely encoded and stored"
    echo "4. Railway handles the connection securely in production"
    echo ""
}

# Main execution
main() {
    clear
    check_prerequisites
    show_connection_info
    deploy_backend
}

# Run main function
main