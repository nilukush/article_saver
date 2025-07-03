#!/bin/bash

echo "Fixing screenshot filenames..."

cd /Users/nileshkumar/gh/article_saver/screenshots

# Check if files exist and rename them
if [ -f "Screenshot 2025-07-03 at 7.53.37 PM.png" ]; then
    cp "Screenshot 2025-07-03 at 7.53.37 PM.png" screenshot-1.png
    echo "✓ Created screenshot-1.png"
fi

if [ -f "Screenshot 2025-07-03 at 7.53.56 PM.png" ]; then
    cp "Screenshot 2025-07-03 at 7.53.56 PM.png" screenshot-2.png
    echo "✓ Created screenshot-2.png"
fi

if [ -f "Screenshot 2025-07-03 at 7.54.01 PM.png" ]; then
    cp "Screenshot 2025-07-03 at 7.54.01 PM.png" screenshot-3.png
    echo "✓ Created screenshot-3.png"
fi

if [ -f "Screenshot 2025-07-03 at 7.54.08 PM.png" ]; then
    cp "Screenshot 2025-07-03 at 7.54.08 PM.png" screenshot-4.png
    echo "✓ Created screenshot-4.png"
fi

if [ -f "Screenshot 2025-07-03 at 8.42.17 PM.png" ]; then
    cp "Screenshot 2025-07-03 at 8.42.17 PM.png" screenshot-5.png
    echo "✓ Created screenshot-5.png"
fi

echo ""
echo "Screenshots fixed! Now commit and push:"
echo "git add screenshots/*.png"
echo "git commit -m 'Add renamed screenshots'"
echo "git push origin main"