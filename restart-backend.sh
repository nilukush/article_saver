#!/bin/bash

cd backend

# Kill any existing process on port 3003
lsof -ti:3003 | xargs kill -9 2>/dev/null || true

# Wait a moment
sleep 2

# Start the backend
echo "Starting backend server..."
npm run dev