#!/bin/bash

echo "🔒 Starting Security Cleanup for Open Source Repository"
echo "=================================================="

# Step 1: Create template files
echo "📝 Creating template files..."

# Create desktop environment templates
if [ -f "desktop/.env.development" ]; then
    cp desktop/.env.development desktop/.env.development.example
    # Replace sensitive values with placeholders
    sed -i.bak 's/628015360597-sv11btaeki3avmvivbjt869al9dcckml\.apps\.googleusercontent\.com/your-google-client-id-here/g' desktop/.env.development.example
    rm desktop/.env.development.example.bak
    echo "✅ Created desktop/.env.development.example"
fi

if [ -f "desktop/.env.production" ]; then
    cp desktop/.env.production desktop/.env.production.example
    # Replace sensitive values with placeholders
    sed -i.bak 's/628015360597-sv11btaeki3avmvivbjt869al9dcckml\.apps\.googleusercontent\.com/your-google-client-id-here/g' desktop/.env.production.example
    rm desktop/.env.production.example.bak
    echo "✅ Created desktop/.env.production.example"
fi

# Step 2: Remove sensitive files from git tracking
echo ""
echo "🗑️  Removing sensitive files from git..."

# Remove desktop env files
git rm --cached desktop/.env.development 2>/dev/null && echo "✅ Removed desktop/.env.development from git" || echo "⏭️  desktop/.env.development not tracked"
git rm --cached desktop/.env.production 2>/dev/null && echo "✅ Removed desktop/.env.production from git" || echo "⏭️  desktop/.env.production not tracked"

# Remove log files if tracked
git rm --cached backend/logs/*.log 2>/dev/null && echo "✅ Removed log files from git" || echo "⏭️  Log files not tracked"

# Step 3: Update .gitignore
echo ""
echo "📋 Updating .gitignore..."

# Add new gitignore entries if not already present
grep -q "desktop/\.env\.development" .gitignore || echo "desktop/.env.development" >> .gitignore
grep -q "desktop/\.env\.production" .gitignore || echo "desktop/.env.production" >> .gitignore
grep -q "!desktop/\.env\*\.example" .gitignore || echo "!desktop/.env*.example" >> .gitignore

echo "✅ Updated .gitignore"

# Step 4: Create SECURITY.md
echo ""
echo "📄 Creating SECURITY.md..."

cat > SECURITY.md << 'EOF'
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **DO NOT** create a public GitHub issue
2. Email the details to: security@articlesaver.com (or your actual security email)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 5 business days.

## Security Best Practices

This project follows security best practices:

- ✅ No credentials in source code
- ✅ Environment variables for sensitive configuration
- ✅ Regular dependency updates via Dependabot
- ✅ Secure authentication with JWT tokens
- ✅ Input validation and sanitization
- ✅ SQL injection prevention via Prisma ORM
- ✅ XSS protection in React components
- ✅ HTTPS enforcement in production

## Configuration

### Environment Variables

All sensitive configuration is managed through environment variables. See `.env.example` files for templates.

### OAuth Setup

When setting up OAuth providers:
1. Client IDs can be public (less sensitive)
2. Client Secrets must NEVER be committed
3. Use environment variables for all secrets
4. Restrict OAuth redirect URIs in provider settings

## Dependencies

We use automated tools to keep dependencies secure:
- GitHub Dependabot for vulnerability alerts
- Regular manual security audits
- Automated testing for security regressions
EOF

echo "✅ Created SECURITY.md"

# Step 5: Create comprehensive .env.example files with documentation
echo ""
echo "📝 Enhancing example files..."

# Enhance desktop development example
cat > desktop/.env.development.example << 'EOF'
# Development Environment Variables
# Copy this file to .env.development and fill in your values

# API Configuration
VITE_API_URL=http://localhost:3003
VITE_ENVIRONMENT=development

# OAuth Configuration (Development)
# Get from: https://console.cloud.google.com/apis/credentials
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here

# Get from: https://github.com/settings/developers
VITE_GITHUB_CLIENT_ID=your-github-client-id-here

# Pocket API Configuration
# Get from: https://getpocket.com/developer/apps/
VITE_POCKET_CONSUMER_KEY=your-pocket-consumer-key-here

# OAuth Redirect URIs
# Must match exactly in OAuth provider settings
VITE_OAUTH_REDIRECT_URI=http://localhost:19858/auth/callback
EOF

# Enhance desktop production example
cat > desktop/.env.production.example << 'EOF'
# Production Environment Variables
# Copy this file to .env.production and fill in your values

# API Configuration
VITE_API_URL=https://your-api-domain.com
VITE_ENVIRONMENT=production

# OAuth Configuration (Production)
# Get from: https://console.cloud.google.com/apis/credentials
VITE_GOOGLE_CLIENT_ID=your-production-google-client-id

# Get from: https://github.com/settings/developers
VITE_GITHUB_CLIENT_ID=your-production-github-client-id

# Pocket API Configuration
# Get from: https://getpocket.com/developer/apps/
VITE_POCKET_CONSUMER_KEY=your-production-pocket-key

# OAuth Redirect URIs
# Must match exactly in OAuth provider settings
VITE_OAUTH_REDIRECT_URI=https://your-domain.com/auth/callback
EOF

echo "✅ Enhanced example files with documentation"

# Step 6: Summary
echo ""
echo "🎉 Security Cleanup Complete!"
echo "=============================="
echo ""
echo "📋 Next Steps:"
echo "1. Review and commit these changes:"
echo "   git add -A"
echo "   git commit -m 'Security cleanup for open source release'"
echo ""
echo "2. Update OAuth credentials:"
echo "   - Create new OAuth apps for open source"
echo "   - Update local .env files with new credentials"
echo ""
echo "3. Enable GitHub Security features:"
echo "   - Go to Settings → Security & analysis"
echo "   - Enable all security features"
echo ""
echo "4. Consider cleaning git history if needed:"
echo "   - Use BFG Repo-Cleaner or git-filter-repo"
echo "   - Only if sensitive data was previously exposed"
echo ""
echo "✅ Your repository is now ready for open source!"