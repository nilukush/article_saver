#!/bin/bash

# Enterprise-grade backend startup script for Article Saver
# Features: Health checks, graceful shutdown, automatic restarts, logging

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Article Saver Backend"
NODE_ENV=${NODE_ENV:-development}
PORT=${PORT:-3003}
LOG_DIR="./logs"
PID_FILE="./backend.pid"
MAX_RESTART_ATTEMPTS=5
RESTART_DELAY=5

# Ensure we're in the backend directory
cd "$(dirname "$0")/.."

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to print colored output
log() {
    echo -e "${2:-$BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Function to check if backend is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# Function to stop backend
stop_backend() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        log "Stopping $APP_NAME (PID: $PID)..." "$YELLOW"
        
        # Send SIGTERM for graceful shutdown
        kill -TERM "$PID" 2>/dev/null || true
        
        # Wait for process to stop (max 10 seconds)
        COUNTER=0
        while [ $COUNTER -lt 10 ]; do
            if ! ps -p "$PID" > /dev/null 2>&1; then
                break
            fi
            sleep 1
            COUNTER=$((COUNTER + 1))
        done
        
        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            log "Force stopping $APP_NAME..." "$RED"
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        rm -f "$PID_FILE"
        log "✅ $APP_NAME stopped" "$GREEN"
    else
        log "$APP_NAME is not running" "$YELLOW"
    fi
}

# Function to start backend
start_backend() {
    if is_running; then
        log "$APP_NAME is already running (PID: $(cat $PID_FILE))" "$YELLOW"
        return 1
    fi
    
    log "🚀 Starting $APP_NAME..." "$GREEN"
    
    # Check Node.js version
    NODE_VERSION=$(node -v)
    log "Node.js version: $NODE_VERSION" "$BLUE"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log "📦 Installing dependencies..." "$YELLOW"
        npm install
    fi
    
    # Run database migrations
    log "🗄️  Running database migrations..." "$BLUE"
    npm run db:generate 2>&1 | tee -a "$LOG_DIR/startup.log"
    npm run db:push 2>&1 | tee -a "$LOG_DIR/startup.log"
    
    # Build TypeScript
    log "🔨 Building TypeScript..." "$BLUE"
    npm run build 2>&1 | tee -a "$LOG_DIR/startup.log"
    
    # Start the backend
    log "🟢 Starting server on port $PORT..." "$GREEN"
    
    if [ "$NODE_ENV" = "production" ]; then
        # Production mode - use PM2 or similar
        nohup node dist/index.js > "$LOG_DIR/server.log" 2>&1 &
        PID=$!
    else
        # Development mode - use nodemon
        nohup npm run dev > "$LOG_DIR/server.log" 2>&1 &
        PID=$!
    fi
    
    echo $PID > "$PID_FILE"
    
    # Wait for server to start
    log "⏳ Waiting for server to be ready..." "$YELLOW"
    COUNTER=0
    while [ $COUNTER -lt 30 ]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" | grep -q "200"; then
            log "✅ $APP_NAME is running successfully! (PID: $PID)" "$GREEN"
            log "📊 Server: http://localhost:$PORT" "$BLUE"
            log "📋 Logs: tail -f $LOG_DIR/server.log" "$BLUE"
            return 0
        fi
        sleep 1
        COUNTER=$((COUNTER + 1))
    done
    
    log "❌ Failed to start $APP_NAME" "$RED"
    stop_backend
    return 1
}

# Function to restart backend
restart_backend() {
    log "🔄 Restarting $APP_NAME..." "$YELLOW"
    stop_backend
    sleep 2
    start_backend
}

# Function to show status
show_status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        log "✅ $APP_NAME is running (PID: $PID)" "$GREEN"
        
        # Show process info
        ps -p "$PID" -o pid,ppid,user,%cpu,%mem,etime,cmd | tail -n +1
        
        # Check API health
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" | grep -q "200"; then
            log "✅ API is healthy" "$GREEN"
        else
            log "⚠️  API health check failed" "$YELLOW"
        fi
    else
        log "❌ $APP_NAME is not running" "$RED"
    fi
}

# Function to tail logs
tail_logs() {
    log "📋 Showing logs (Ctrl+C to exit)..." "$BLUE"
    tail -f "$LOG_DIR/server.log" "$LOG_DIR/error.log" 2>/dev/null
}

# Function to run with auto-restart
run_with_autorestart() {
    RESTART_COUNT=0
    
    while [ $RESTART_COUNT -lt $MAX_RESTART_ATTEMPTS ]; do
        start_backend
        
        if [ $? -eq 0 ]; then
            # Monitor the process
            PID=$(cat "$PID_FILE")
            
            while ps -p "$PID" > /dev/null 2>&1; do
                sleep 5
            done
            
            log "⚠️  $APP_NAME crashed! Attempt $((RESTART_COUNT + 1))/$MAX_RESTART_ATTEMPTS" "$RED"
            RESTART_COUNT=$((RESTART_COUNT + 1))
            
            if [ $RESTART_COUNT -lt $MAX_RESTART_ATTEMPTS ]; then
                log "🔄 Restarting in $RESTART_DELAY seconds..." "$YELLOW"
                sleep $RESTART_DELAY
            fi
        else
            break
        fi
    done
    
    log "❌ $APP_NAME failed to start after $MAX_RESTART_ATTEMPTS attempts" "$RED"
    exit 1
}

# Main command handling
case "${1:-start}" in
    start)
        start_backend
        ;;
    stop)
        stop_backend
        ;;
    restart)
        restart_backend
        ;;
    status)
        show_status
        ;;
    logs)
        tail_logs
        ;;
    run)
        # Run with auto-restart on crash
        trap 'stop_backend; exit' INT TERM
        run_with_autorestart
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|run}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the backend server"
        echo "  stop     - Stop the backend server"
        echo "  restart  - Restart the backend server"
        echo "  status   - Show server status"
        echo "  logs     - Tail server logs"
        echo "  run      - Run with auto-restart on crash"
        exit 1
        ;;
esac