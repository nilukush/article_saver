#!/bin/bash
# Quick fix script for GitHub Actions exit code 143 issue

echo "Fixing GitHub Actions workflow..."

# Backup current workflow
if [ -f ".github/workflows/main.yml" ]; then
    cp .github/workflows/main.yml .github/workflows/main.yml.backup
    echo "✓ Backed up current workflow to main.yml.backup"
fi

# Apply the fix
cp .github/workflows/main-fixed.yml .github/workflows/main.yml
echo "✓ Applied fixed workflow"

# Ensure scripts directory exists
mkdir -p .github/scripts
echo "✓ Ensured scripts directory exists"

# Make install handler executable
chmod +x .github/scripts/npm-install-handler.sh
echo "✓ Made install handler executable"

echo ""
echo "Fix applied! Next steps:"
echo "1. Review the changes: git diff .github/workflows/main.yml"
echo "2. Commit the changes: git add -A && git commit -m 'Fix GitHub Actions exit code 143 issue'"
echo "3. Push to trigger workflow: git push"
echo ""
echo "The fix includes:"
echo "- Increased swap space to 16GB"
echo "- Limited concurrent operations with UV_THREADPOOL_SIZE=1"
echo "- Sequential installation fallback"
echo "- Memory monitoring and cleanup"
echo "- Comprehensive error handling"
echo ""
echo "Expected result: Installation should complete successfully in 8-12 minutes."