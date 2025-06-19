#!/bin/bash

# Article Saver Backend Restart Script

echo "🔄 Restarting Article Saver Backend..."

# Find and kill existing process
if pgrep -f "node.*dist/index.js" > /dev/null; then
    echo "⏹️  Stopping existing backend process..."
    pkill -f "node.*dist/index.js"
    sleep 2
fi

# Start the backend
echo "🚀 Starting backend..."
./scripts/start.sh run