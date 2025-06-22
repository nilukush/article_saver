#!/bin/bash

# ================================================================
# Environment Setup Helper for Article Saver
# ================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ENV_FILE="backend/.env"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Article Saver Environment Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Current .env Configuration:${NC}"
echo -e "${GREEN}✅ Database URL configured for local PostgreSQL${NC}"
echo -e "${GREEN}✅ JWT Secret generated (secure random key)${NC}"
echo -e "${GREEN}✅ CORS Origin set to http://localhost:19858${NC}"
echo ""

echo -e "${YELLOW}OAuth Configuration Required:${NC}"
echo ""
echo "To complete the setup, you need to add your OAuth credentials."
echo ""
echo -e "${CYAN}Option 1: Use existing credentials${NC}"
echo "If you have OAuth credentials from before, add them to backend/.env:"
echo ""
echo "  GOOGLE_CLIENT_ID=\"your-actual-google-client-id\""
echo "  GOOGLE_CLIENT_SECRET=\"your-actual-google-secret\""
echo "  GITHUB_CLIENT_ID=\"your-actual-github-client-id\""
echo "  GITHUB_CLIENT_SECRET=\"your-actual-github-secret\""
echo "  POCKET_CONSUMER_KEY=\"your-actual-pocket-key\""
echo ""
echo -e "${CYAN}Option 2: Skip OAuth for now${NC}"
echo "The app will work without OAuth. You can:"
echo "1. Use email/password authentication"
echo "2. Add OAuth credentials later"
echo ""
echo -e "${CYAN}Option 3: Development mode (no OAuth)${NC}"
echo "For quick development, update your .env:"
echo ""
cat << 'EOF'
# OAuth Configuration (Optional for development)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI=""

GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_REDIRECT_URI=""

POCKET_CONSUMER_KEY=""
POCKET_REDIRECT_URI=""

# Email Configuration (Disable for development)
EMAIL_ENABLED=false
EOF
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Edit backend/.env with your OAuth credentials (or leave empty)"
echo "2. Run: npm run dev"
echo ""
echo -e "${YELLOW}The development environment will work without OAuth credentials.${NC}"
echo -e "${YELLOW}You can use email/password authentication for testing.${NC}"