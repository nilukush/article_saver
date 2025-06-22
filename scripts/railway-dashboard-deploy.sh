#!/bin/bash
# Railway Dashboard Deployment Helper
# Alternative method using Railway dashboard for environment variables

set -e

echo "🚂 Railway Dashboard Deployment Method"
echo "====================================="
echo ""

# Colors
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

# Get database details
echo "📝 Database Configuration"
echo "========================"
echo ""

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

# URL encode the password
ENCODED_PASSWORD=$(urlencode "$DB_PASSWORD")

# Construct the connection string
DATABASE_URL="postgresql://${DB_USER}:${ENCODED_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Create the environment variables JSON
cat > railway-env.json << EOF
{
  "DATABASE_URL": "$DATABASE_URL",
  "JWT_SECRET": "$JWT_SECRET",
  "NODE_ENV": "production",
  "PORT": "3003",
  "LOG_LEVEL": "info",
  "CORS_ORIGIN": "*"
}
EOF

echo ""
echo -e "${GREEN}✓ Environment configuration created${NC}"
echo ""
echo "📋 Now follow these steps:"
echo ""
echo "1. Open your Railway project:"
echo -e "   ${BLUE}https://railway.com/project/fbdacbbd-362b-49f7-ae1f-23754d403c95${NC}"
echo ""
echo "2. Click on the ${YELLOW}'Variables'${NC} tab"
echo ""
echo "3. Click ${YELLOW}'RAW Editor'${NC} button"
echo ""
echo "4. Copy and paste this JSON:"
echo ""
echo "------- COPY BELOW THIS LINE -------"
cat railway-env.json
echo "------- COPY ABOVE THIS LINE -------"
echo ""
echo "5. Click ${GREEN}'Update Variables'${NC}"
echo ""
echo "6. Then deploy from your backend directory:"
echo "   ${YELLOW}cd backend && railway up${NC}"
echo ""
echo -e "${GREEN}✅ Configuration saved to railway-env.json${NC}"
echo ""

# Optionally open the dashboard
read -p "Open Railway dashboard in browser? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://railway.com/project/fbdacbbd-362b-49f7-ae1f-23754d403c95/settings/variables"
fi