#!/bin/bash
# Backend Deployment Script for Railway
# This script helps deploy the Article Saver backend to Railway

set -e

echo "🚂 Article Saver Backend Deployment to Railway"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

echo "📋 Prerequisites:"
echo "1. Railway account (create at railway.app)"
echo "2. Supabase account for database (create at supabase.com)"
echo "3. Environment variables ready"
echo ""

read -p "Do you have all prerequisites ready? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please complete the prerequisites first:"
    echo "- Sign up at https://railway.app"
    echo "- Sign up at https://supabase.com"
    echo "- Create a new project in Supabase and copy the connection string"
    exit 1
fi

# Login to Railway
echo ""
echo "🔐 Logging in to Railway..."
railway login

# Navigate to backend directory
cd backend

# Initialize Railway project if not already done
if [ ! -f ".railway" ]; then
    echo ""
    echo "🚀 Initializing Railway project..."
    railway init
fi

# Set up environment variables
echo ""
echo "🔧 Setting up environment variables..."
echo "Please provide the following values:"
echo ""

# Database URL from Supabase
read -p "Enter your Supabase DATABASE_URL: " DATABASE_URL
railway variables set DATABASE_URL="$DATABASE_URL"

# JWT Secret
echo ""
echo "Generating secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
railway variables set JWT_SECRET="$JWT_SECRET"
echo -e "${GREEN}✓ JWT secret generated and set${NC}"

# OAuth credentials (optional)
echo ""
read -p "Do you want to set up OAuth providers? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Google OAuth
    echo ""
    read -p "Enter GOOGLE_CLIENT_ID (or press Enter to skip): " GOOGLE_CLIENT_ID
    if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
        railway variables set GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
        read -p "Enter GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
        railway variables set GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
    fi
    
    # GitHub OAuth
    echo ""
    read -p "Enter GITHUB_CLIENT_ID (or press Enter to skip): " GITHUB_CLIENT_ID
    if [ ! -z "$GITHUB_CLIENT_ID" ]; then
        railway variables set GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID"
        read -p "Enter GITHUB_CLIENT_SECRET: " GITHUB_CLIENT_SECRET
        railway variables set GITHUB_CLIENT_SECRET="$GITHUB_CLIENT_SECRET"
    fi
fi

# Deploy to Railway
echo ""
echo "🚀 Deploying to Railway..."
railway up

# Get the deployment URL
echo ""
echo "⏳ Waiting for deployment to complete..."
sleep 10

# Get public URL
RAILWAY_URL=$(railway variables get RAILWAY_PUBLIC_DOMAIN 2>/dev/null || echo "")

if [ ! -z "$RAILWAY_URL" ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "Your backend is now live at:"
    echo -e "${GREEN}https://${RAILWAY_URL}${NC}"
    echo ""
    echo "API Health Check: https://${RAILWAY_URL}/api/health"
    echo ""
    echo "📝 Next steps:"
    echo "1. Update your desktop app configuration with this URL"
    echo "2. Set up GitHub Actions for continuous deployment"
    echo "3. Monitor your usage at https://railway.app/dashboard"
else
    echo ""
    echo -e "${YELLOW}⚠️  Deployment completed but couldn't retrieve public URL${NC}"
    echo "Please check your Railway dashboard for the deployment URL"
fi

echo ""
echo "💡 Important notes:"
echo "- Railway uses usage-based pricing (monitor at railway.app/usage)"
echo "- Your JWT secret has been securely generated and stored"
echo "- Database is hosted on Supabase (500MB free tier)"
echo "- Set up custom domain later when ready"

# Return to root directory
cd ..

echo ""
echo "🎉 Backend deployment complete!"