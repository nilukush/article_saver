#!/bin/bash

# ================================================================
# PostgreSQL PATH Setup Script
# ================================================================

echo "Setting up PostgreSQL in your PATH..."

# Detect PostgreSQL installation
if [ -d "/opt/homebrew/opt/postgresql@16/bin" ]; then
    PG_PATH="/opt/homebrew/opt/postgresql@16/bin"
    echo "Found PostgreSQL 16 at: $PG_PATH"
elif [ -d "/usr/local/opt/postgresql@16/bin" ]; then
    PG_PATH="/usr/local/opt/postgresql@16/bin"
    echo "Found PostgreSQL 16 at: $PG_PATH"
elif [ -d "/opt/homebrew/opt/postgresql@14/bin" ]; then
    PG_PATH="/opt/homebrew/opt/postgresql@14/bin"
    echo "Found PostgreSQL 14 at: $PG_PATH"
else
    echo "PostgreSQL not found. Please install it with: brew install postgresql@16"
    exit 1
fi

# Detect shell and update appropriate config file
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    echo "Detected zsh shell"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bash_profile"
    echo "Detected bash shell"
else
    echo "Unknown shell. Please add this to your PATH manually: $PG_PATH"
    exit 1
fi

# Check if already in PATH
if grep -q "postgresql" "$SHELL_CONFIG" 2>/dev/null; then
    echo "PostgreSQL path already exists in $SHELL_CONFIG"
else
    echo "" >> "$SHELL_CONFIG"
    echo "# PostgreSQL" >> "$SHELL_CONFIG"
    echo "export PATH=\"$PG_PATH:\$PATH\"" >> "$SHELL_CONFIG"
    echo "Added PostgreSQL to $SHELL_CONFIG"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To use PostgreSQL commands now, run:"
echo "  source $SHELL_CONFIG"
echo ""
echo "Or simply run the development script again:"
echo "  npm run dev"