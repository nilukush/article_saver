#!/bin/bash
# Open deployment documentation in Cursor with preview

echo "📚 Opening Article Saver Deployment Documentation"
echo "================================================"
echo ""
echo "This will open both deployment documents in Cursor with markdown preview."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Cursor is installed
if command -v cursor &> /dev/null; then
    echo -e "${GREEN}✓ Cursor found${NC}"
    
    # Open both files in Cursor
    echo ""
    echo "Opening DEPLOYMENT.md and DEPLOYMENT_CHECKLIST.md..."
    cursor DEPLOYMENT.md DEPLOYMENT_CHECKLIST.md
    
    echo ""
    echo -e "${GREEN}✅ Files opened in Cursor!${NC}"
    echo ""
    echo "📖 To view in preview mode:"
    echo "   • Mac: Press ⇧⌘V (Shift+Cmd+V)"
    echo "   • Windows/Linux: Press Ctrl+Shift+V"
    echo ""
    echo "📖 For side-by-side preview:"
    echo "   • Mac: Press ⌘K then V"
    echo "   • Windows/Linux: Press Ctrl+K then V"
    echo ""
    echo "💡 Pro tip: Use side-by-side view to read while keeping code visible!"
    
else
    echo -e "${YELLOW}⚠️  Cursor not found in PATH${NC}"
    echo ""
    echo "Please ensure Cursor is installed and added to PATH:"
    echo "1. Open Cursor"
    echo "2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)"
    echo "3. Type 'Shell Command: Install cursor command in PATH'"
    echo "4. Run this script again"
fi