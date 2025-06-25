#!/bin/bash
set -e

echo "Installing dependencies for monorepo..."

# Install root dependencies
echo "Installing root dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --no-audit --no-fund
else
    npm install --no-audit --no-fund
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
if [ -f "package-lock.json" ]; then
    npm ci --no-audit --no-fund
else
    npm install --no-audit --no-fund
fi
cd ..

# Install desktop dependencies
echo "Installing desktop dependencies..."
cd desktop
if [ -f "package-lock.json" ]; then
    npm ci --no-audit --no-fund --ignore-scripts
else
    npm install --no-audit --no-fund --ignore-scripts
fi
cd ..

echo "Dependencies installed successfully!"