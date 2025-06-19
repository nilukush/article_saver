#!/bin/bash

# Simple enterprise-grade restart script for Article Saver Backend

echo "🔄 Restarting Article Saver Backend..."

# Kill existing process on port 3003
echo "⏹️  Stopping existing backend..."
lsof -ti:3003 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 2

# Start backend in development mode
echo "🚀 Starting backend..."
cd "$(dirname "$0")"
npm run dev &

echo "✅ Backend restarted!"
echo "📊 Server: http://localhost:3003"
echo "📋 Check logs with: npm run logs"