#!/bin/bash

# Simple script to test the static pages locally

echo "🚀 Starting local server for testing Article Saver pages..."
echo "📁 Serving from: $(pwd)"
echo ""
echo "🌐 Pages available at:"
echo "  - Home: http://localhost:8000/"
echo "  - Support: http://localhost:8000/support.html"
echo "  - Migration Guide: http://localhost:8000/blog/migrate-from-pocket.html"
echo "  - Downloads: http://localhost:8000/downloads.html"
echo "  - Dashboard: http://localhost:8000/dashboard/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Python HTTP server
python3 -m http.server 8000