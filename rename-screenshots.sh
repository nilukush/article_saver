#!/bin/bash

# Navigate to screenshots directory
cd /Users/nileshkumar/gh/article_saver/screenshots

# Check if we're in the right directory
if [ ! -f "Screenshot 2025-07-03 at 7.53.37 PM.png" ]; then
    echo "Error: Screenshot files not found. Make sure you're in the right directory."
    exit 1
fi

echo "Renaming screenshot files to web-safe names..."

# Rename each file
if [ -f "Screenshot 2025-07-03 at 7.53.37 PM.png" ]; then
    mv "Screenshot 2025-07-03 at 7.53.37 PM.png" "screenshot-article-list.png"
    echo "✓ Renamed article list screenshot"
fi

if [ -f "Screenshot 2025-07-03 at 7.53.56 PM.png" ]; then
    mv "Screenshot 2025-07-03 at 7.53.56 PM.png" "screenshot-account-panel.png"
    echo "✓ Renamed account panel screenshot"
fi

if [ -f "Screenshot 2025-07-03 at 7.54.01 PM.png" ]; then
    mv "Screenshot 2025-07-03 at 7.54.01 PM.png" "screenshot-pocket-integration.png"
    echo "✓ Renamed pocket integration screenshot"
fi

if [ -f "Screenshot 2025-07-03 at 7.54.08 PM.png" ]; then
    mv "Screenshot 2025-07-03 at 7.54.08 PM.png" "screenshot-add-article.png"
    echo "✓ Renamed add article screenshot"
fi

if [ -f "Screenshot 2025-07-03 at 8.42.17 PM.png" ]; then
    mv "Screenshot 2025-07-03 at 8.42.17 PM.png" "screenshot-import-progress.png"
    echo "✓ Renamed import progress screenshot"
fi

echo ""
echo "All screenshots renamed successfully!"
echo "Now update index.html to use the new filenames."