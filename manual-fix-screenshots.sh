#!/bin/bash

cd /Users/nileshkumar/gh/article_saver/screenshots

# Create copies with simple names
echo "Creating screenshot copies..."

# Use wildcards to match files
cp Screenshot*7.53.37*.png screenshot-1.png 2>/dev/null && echo "✓ Created screenshot-1.png"
cp Screenshot*7.53.56*.png screenshot-2.png 2>/dev/null && echo "✓ Created screenshot-2.png"
cp Screenshot*7.54.01*.png screenshot-3.png 2>/dev/null && echo "✓ Created screenshot-3.png"
cp Screenshot*7.54.08*.png screenshot-4.png 2>/dev/null && echo "✓ Created screenshot-4.png"
cp Screenshot*8.42.17*.png screenshot-5.png 2>/dev/null && echo "✓ Created screenshot-5.png"

echo "Done!"
ls -la screenshot-*.png