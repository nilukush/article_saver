#!/bin/bash
echo "🚀 Starting Apache Superset..."
source analytics-env/bin/activate
export FLASK_APP=superset
export SUPERSET_CONFIG_PATH=$PWD/superset_config.py

# Check if running on macOS and port 8088 is available
if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :8088 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port 8088 is already in use!"
        echo "Run 'lsof -i :8088' to see what's using it"
        exit 1
    fi
fi

echo "📊 Superset is starting at http://localhost:8088"
echo "Press Ctrl+C to stop"
echo ""
gunicorn \
    --bind "0.0.0.0:8088" \
    --access-logfile '-' \
    --error-logfile '-' \
    --workers 1 \
    --worker-class gevent \
    --threads 20 \
    --timeout 60 \
    --limit-request-line 0 \
    --limit-request-field_size 0 \
    "superset.app:create_app()"
