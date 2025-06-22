#!/bin/bash
# Helper script to set Railway environment variables with proper escaping

set -e

echo "🔧 Railway Environment Variable Setup"
echo "===================================="
echo ""
echo "This script helps set environment variables with special characters."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "package.json" ] || [ ! -f "railway.json" ]; then
    echo -e "${RED}Error: Please run this script from the backend directory${NC}"
    echo "cd backend && ../scripts/set-railway-env.sh"
    exit 1
fi

# Function to set Railway variable safely
set_railway_var() {
    local var_name=$1
    local var_value=$2
    
    echo "Setting $var_name..."
    
    # Create a temporary file with the value
    local temp_file=$(mktemp)
    echo -n "$var_value" > "$temp_file"
    
    # Use Railway CLI with file input
    if railway variables set "$var_name" < "$temp_file"; then
        echo -e "${GREEN}✓ $var_name set successfully${NC}"
    else
        echo -e "${RED}✗ Failed to set $var_name${NC}"
        rm -f "$temp_file"
        return 1
    fi
    
    # Clean up
    rm -f "$temp_file"
}

echo "📝 Setting DATABASE_URL"
echo "Please paste your Supabase DATABASE_URL below and press Enter:"
echo "(The password will be handled securely with all special characters)"
echo ""
read -r DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL cannot be empty${NC}"
    exit 1
fi

# Set the DATABASE_URL
set_railway_var "DATABASE_URL" "$DATABASE_URL"

echo ""
echo "🔐 Generating JWT_SECRET..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
set_railway_var "JWT_SECRET" "$JWT_SECRET"

echo ""
echo "🌐 Setting other environment variables..."
set_railway_var "NODE_ENV" "production"
set_railway_var "PORT" "3003"
set_railway_var "LOG_LEVEL" "info"
set_railway_var "CORS_ORIGIN" "https://github.com"

echo ""
echo -e "${GREEN}✅ Environment variables set successfully!${NC}"
echo ""
echo "📝 Optional: Set OAuth credentials"
read -p "Do you want to set up OAuth providers? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Google OAuth
    echo ""
    echo "Google OAuth Setup (press Enter to skip):"
    read -p "GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
    if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
        set_railway_var "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
        read -p "GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
        if [ ! -z "$GOOGLE_CLIENT_SECRET" ]; then
            set_railway_var "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
        fi
    fi
    
    # GitHub OAuth
    echo ""
    echo "GitHub OAuth Setup (press Enter to skip):"
    read -p "GITHUB_CLIENT_ID: " GITHUB_CLIENT_ID
    if [ ! -z "$GITHUB_CLIENT_ID" ]; then
        set_railway_var "GITHUB_CLIENT_ID" "$GITHUB_CLIENT_ID"
        read -p "GITHUB_CLIENT_SECRET: " GITHUB_CLIENT_SECRET
        if [ ! -z "$GITHUB_CLIENT_SECRET" ]; then
            set_railway_var "GITHUB_CLIENT_SECRET" "$GITHUB_CLIENT_SECRET"
        fi
    fi
fi

echo ""
echo -e "${GREEN}✅ All environment variables configured!${NC}"
echo ""
echo "Next steps:"
echo "1. Run 'railway up' to deploy your backend"
echo "2. Run 'railway open' to view your project dashboard"
echo ""