#!/bin/bash
# Railway API Deployment Script
# Uses Railway GraphQL API to set variables

set -e

echo "🚂 Railway API Deployment Method"
echo "================================"
echo ""
echo "⚠️  NOTE: Railway CLI v3 removed 'variables set' command"
echo "This script uses the Railway API as a workaround"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in backend directory
if [ ! -f "package.json" ] || [ ! -f "railway.json" ]; then
    echo -e "${RED}Error: Please run from backend directory${NC}"
    echo "cd backend && ../scripts/railway-api-deploy.sh"
    exit 1
fi

# Get Railway token
echo "First, we need your Railway API token:"
echo "1. Go to: https://railway.app/account/tokens"
echo "2. Create a new token"
echo "3. Copy and paste it here"
echo ""
read -s -p "Railway API Token: " RAILWAY_TOKEN
echo ""

if [ -z "$RAILWAY_TOKEN" ]; then
    echo -e "${RED}Error: Railway token is required${NC}"
    exit 1
fi

# Function to URL encode
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

# Get project ID from railway.json
PROJECT_ID=$(cat .railway/config.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Could not find project ID${NC}"
    echo "Make sure you're in the backend directory with Railway initialized"
    exit 1
fi

echo -e "${GREEN}✓ Found Railway project: $PROJECT_ID${NC}"
echo ""

# Get database details
echo "📝 Database Configuration"
echo "========================"
read -p "Database Host: " DB_HOST
read -p "Database Port (default 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}
read -p "Database Name (default postgres): " DB_NAME
DB_NAME=${DB_NAME:-postgres}
read -p "Database User (default postgres): " DB_USER
DB_USER=${DB_USER:-postgres}
echo -n "Database Password: "
read -s DB_PASSWORD
echo ""

# URL encode password
ENCODED_PASSWORD=$(urlencode "$DB_PASSWORD")
DATABASE_URL="postgresql://${DB_USER}:${ENCODED_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo ""
echo "🔧 Setting environment variables via API..."

# Function to set variable via API
set_railway_variable() {
    local key=$1
    local value=$2
    
    curl -s -X POST https://backboard.railway.app/graphql \
        -H "Authorization: Bearer $RAILWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"mutation { variableCollectionUpsert(input: { projectId: \\\"$PROJECT_ID\\\", environmentId: \\\"production\\\", variables: { \\\"$key\\\": \\\"$value\\\" } }) { id } }\"
        }" > /dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Set $key${NC}"
    else
        echo -e "${RED}✗ Failed to set $key${NC}"
    fi
}

# Set variables
set_railway_variable "DATABASE_URL" "$DATABASE_URL"
set_railway_variable "JWT_SECRET" "$JWT_SECRET"
set_railway_variable "NODE_ENV" "production"
set_railway_variable "PORT" "3003"
set_railway_variable "LOG_LEVEL" "info"

echo ""
echo -e "${GREEN}✅ Variables set successfully!${NC}"
echo ""
echo "Now deploy with:"
echo -e "${YELLOW}railway up${NC}"
echo ""
echo "Or visit your project:"
echo "https://railway.com/project/$PROJECT_ID"