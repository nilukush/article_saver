#!/bin/bash
# Batch ESLint Processing for Memory Efficiency
# Prevents memory exhaustion by processing files in smaller batches

set -euo pipefail

# Configuration
BATCH_SIZE=15
MAX_MEMORY_MB=1536
CACHE_DIR=".eslintcache"

# Arguments
WORKSPACE="${1:-backend}"
EXTENSIONS="${2:-.ts,.tsx}"

echo "=== ESLint Batch Processor ==="
echo "Workspace: $WORKSPACE"
echo "Extensions: $EXTENSIONS"
echo "Batch size: $BATCH_SIZE files"
echo "Memory limit: ${MAX_MEMORY_MB}MB"

cd "$WORKSPACE"

# Ensure cache directory exists
mkdir -p "$CACHE_DIR"

# Create .eslintignore if it doesn't exist
if [ ! -f .eslintignore ]; then
    echo "Creating .eslintignore..."
    if [ "$WORKSPACE" = "backend" ]; then
        cat > .eslintignore << 'EOF'
dist/
node_modules/
*.js
!*.config.js
.env*
coverage/
build/
prisma/migrations/
logs/
*.log
EOF
    else
        cat > .eslintignore << 'EOF'
dist/
node_modules/
release/
logs/
*.js
!vite.config.js
!tailwind.config.js
!postcss.config.js
resources/
scripts/*.js
public/
coverage/
build/
.vite/
.cache/
*.min.js
*.bundle.js
out/
EOF
    fi
fi

# Find all TypeScript files
echo "Finding files to lint..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort > all-files.txt
TOTAL_FILES=$(wc -l < all-files.txt)

echo "Found $TOTAL_FILES files to process"

# Split files into batches
split -l $BATCH_SIZE all-files.txt batch-

# Process each batch
BATCH_NUM=0
TOTAL_BATCHES=$(ls batch-* | wc -l)
LINT_ERRORS=0

for batch in batch-*; do
    BATCH_NUM=$((BATCH_NUM + 1))
    FILES_IN_BATCH=$(wc -l < "$batch")
    
    echo ""
    echo "Processing batch $BATCH_NUM/$TOTAL_BATCHES ($FILES_IN_BATCH files)..."
    
    # Set memory limit for this batch
    export NODE_OPTIONS="--max-old-space-size=$MAX_MEMORY_MB"
    
    # Run ESLint on the batch
    if cat "$batch" | xargs npx eslint \
        --cache \
        --cache-location "$CACHE_DIR" \
        --max-warnings 50 \
        --format stylish; then
        echo "✓ Batch $BATCH_NUM completed successfully"
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 1 ]; then
            echo "⚠ Batch $BATCH_NUM completed with warnings"
        else
            echo "✗ Batch $BATCH_NUM failed with exit code $EXIT_CODE"
            LINT_ERRORS=$((LINT_ERRORS + 1))
        fi
    fi
    
    # Clear memory between batches
    if command -v sync >/dev/null 2>&1; then
        sync
        echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || true
    fi
    
    # Small delay between batches
    sleep 1
done

# Cleanup
rm -f batch-* all-files.txt

echo ""
echo "=== ESLint Batch Processing Complete ==="
echo "Total files processed: $TOTAL_FILES"
echo "Batches with errors: $LINT_ERRORS"

# Exit with appropriate code
if [ $LINT_ERRORS -gt 0 ]; then
    exit 2
else
    exit 0
fi