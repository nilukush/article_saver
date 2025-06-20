#!/bin/bash

# ENTERPRISE-GRADE COMPLETE DATA CLEANUP SCRIPT
# 
# Cleans all articles and import sessions from both:
# - Backend PostgreSQL database 
# - Desktop local JSON database
#
# Usage: ./clean-all-data.sh

set -e  # Exit on any error

echo "🧹 ENTERPRISE COMPLETE DATA CLEANUP"
echo "===================================="
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists npm; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

if ! command_exists node; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Confirm destructive operation
echo "⚠️  WARNING: This will permanently delete ALL articles and import sessions"
echo "   from both the backend database and desktop local storage."
echo ""
read -p "Type 'YES' to confirm: " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "❌ Operation cancelled by user."
    exit 0
fi

echo ""
echo "🚀 Starting complete data cleanup..."
echo ""

# Step 1: Clean backend database
echo "📊 Step 1/2: Cleaning backend database..."
echo "========================================="
cd backend
npm run clean:data
cd ..
echo ""

# Step 2: Clean desktop local data  
echo "💻 Step 2/2: Cleaning desktop local data..."
echo "==========================================="
cd desktop
npm run clean:data
cd ..
echo ""

echo "🎉 COMPLETE DATA CLEANUP FINISHED"
echo "=================================="
echo "✅ Backend database cleaned (PostgreSQL)"
echo "✅ Desktop local data cleaned (JSON)" 
echo "✅ All articles and import sessions removed"
echo "✅ User accounts remain intact"
echo ""
echo "🔄 Recommendation: Restart both backend and desktop applications"
echo "   to ensure clean state is properly loaded."