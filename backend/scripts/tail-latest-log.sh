#!/bin/bash

# Find the latest combined log file
LATEST_LOG=$(ls -t logs/combined*.log 2>/dev/null | head -1)

if [ -z "$LATEST_LOG" ]; then
    echo "No log files found in logs/ directory"
    exit 1
fi

echo "📋 Tailing latest log file: $LATEST_LOG"
echo "Press Ctrl+C to stop"
echo "----------------------------------------"

tail -f "$LATEST_LOG"