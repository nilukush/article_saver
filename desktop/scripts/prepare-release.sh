#!/bin/bash

# Article Saver Desktop Release Preparation Script
# This script prepares the desktop app for distribution

echo "🚀 Preparing Article Saver Desktop for Release"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the desktop directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}Error: Please run this script from the desktop directory${NC}"
    exit 1
fi

# Step 1: Clean previous builds
echo -e "\n${YELLOW}Step 1: Cleaning previous builds...${NC}"
npm run clean
rm -rf release/

# Step 2: Install dependencies
echo -e "\n${YELLOW}Step 2: Installing dependencies...${NC}"
npm ci

# Step 3: Build TypeScript
echo -e "\n${YELLOW}Step 3: Building TypeScript...${NC}"
npm run build

# Step 4: Update production environment
echo -e "\n${YELLOW}Step 4: Setting production environment...${NC}"
export NODE_ENV=production

# Step 5: Build for current platform (test)
echo -e "\n${YELLOW}Step 5: Building for current platform...${NC}"
npm run dist

# Check if build was successful
if [ -d "release" ]; then
    echo -e "\n${GREEN}✅ Build successful!${NC}"
    echo -e "\nBuilt packages:"
    ls -la release/
else
    echo -e "\n${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 Release preparation complete!${NC}"
echo -e "\nTo create a full release:"
echo -e "  1. Update version in package.json"
echo -e "  2. Commit changes: git commit -am 'Release v1.0.0'"
echo -e "  3. Create tag: git tag v1.0.0"
echo -e "  4. Push with tags: git push origin main --tags"
echo -e "\nGitHub Actions will then build for all platforms automatically!"