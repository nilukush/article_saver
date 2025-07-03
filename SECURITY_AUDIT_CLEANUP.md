# Security Audit & Repository Cleanup Plan

## 🚨 Critical Issues Found

### 1. Exposed Google OAuth Client ID
**File**: `desktop/.env.development` and `desktop/.env.production`
**Issue**: Contains real Google Client ID: `628015360597-sv11btaeki3avmvivbjt869al9dcckml.apps.googleusercontent.com`
**Risk**: While client IDs are less sensitive than secrets, they should use placeholders in public repos

### 2. Environment Files in Repository
**Files**: 
- `desktop/.env.development`
- `desktop/.env.production`
**Issue**: These should be templates, not actual config files

### 3. Log Files Present
**Files**: 
- `backend/logs/combined.log`
- `backend/logs/debug.log`
- `backend/logs/error.log`
**Issue**: May contain sensitive debug information

## 📋 Immediate Action Plan

### Step 1: Remove Sensitive Files

```bash
# Remove environment files from tracking
git rm --cached desktop/.env.development
git rm --cached desktop/.env.production

# Remove log files if they exist in repo
git rm --cached backend/logs/*.log 2>/dev/null || true

# Add to .gitignore
echo "desktop/.env.development" >> .gitignore
echo "desktop/.env.production" >> .gitignore
```

### Step 2: Create Template Files

```bash
# Create environment templates
cp desktop/.env.development desktop/.env.development.example
cp desktop/.env.production desktop/.env.production.example

# Replace sensitive values with placeholders
sed -i '' 's/628015360597-sv11btaeki3avmvivbjt869al9dcckml/your-google-client-id-here/g' desktop/.env.development.example
sed -i '' 's/628015360597-sv11btaeki3avmvivbjt869al9dcckml/your-google-client-id-here/g' desktop/.env.production.example
```

### Step 3: Update .gitignore

Add these entries:
```
# Environment files with real values
desktop/.env*
!desktop/.env*.example
!desktop/.env*.sample

# Logs
backend/logs/*.log
*.log

# Local development files
.env.local
*.local

# Security
*-credentials.json
*-secrets.json
```

### Step 4: Create Security Documentation

Create `SECURITY.md`:
```markdown
# Security Policy

## Reporting Security Vulnerabilities

Please report security vulnerabilities to: [your-email-or-security-contact]

## Security Best Practices

This project follows security best practices:
- No credentials in source code
- Environment variables for configuration
- Regular dependency updates
- Secure authentication implementation
```

### Step 5: Review Code for Hardcoded Values

Files to check:
- All TypeScript/JavaScript files for hardcoded URLs
- Configuration files for sensitive defaults
- Build scripts for production values

## 🔒 Best Practices Implementation

### 1. Environment Variable Management

**Development Setup Guide** (`DEVELOPMENT_SETUP.md`):
```markdown
## Environment Setup

1. Copy environment templates:
   ```bash
   cp desktop/.env.development.example desktop/.env.development
   cp desktop/.env.production.example desktop/.env.production
   ```

2. Fill in your values:
   - `VITE_GOOGLE_CLIENT_ID`: Get from Google Cloud Console
   - `VITE_GITHUB_CLIENT_ID`: Get from GitHub OAuth Apps
   - `VITE_POCKET_CONSUMER_KEY`: Get from Pocket Developer
```

### 2. OAuth Security

**Important**: For OAuth in open source:
- Client IDs can be public (less sensitive)
- Client Secrets must NEVER be in the repo
- Use environment variables for all secrets
- Document how to obtain OAuth credentials

### 3. Clean Git History (Optional)

If sensitive data was committed:
```bash
# Use BFG Repo-Cleaner or git-filter-repo
# Example with git-filter-repo:
git filter-repo --path desktop/.env.development --invert-paths
git filter-repo --path desktop/.env.production --invert-paths
```

## 📁 Final Repository Structure

```
article_saver/
├── backend/
│   ├── .env.example          ✅ Template only
│   └── logs/                 ❌ Not in repo
├── desktop/
│   ├── .env.development.example  ✅ Template
│   ├── .env.production.example   ✅ Template
│   ├── .env.development          ❌ Local only
│   └── .env.production           ❌ Local only
├── .gitignore                    ✅ Updated
├── SECURITY.md                   ✅ New file
├── README.md                     ✅ Updated
└── LICENSE                       ✅ Required
```

## 🚀 Additional Recommendations

1. **Enable GitHub Security Features**:
   - Go to Settings → Security → Enable all
   - Dependabot alerts
   - Secret scanning
   - Code scanning

2. **Add Branch Protection**:
   - Protect main branch
   - Require PR reviews
   - Enable status checks

3. **Use GitHub Secrets**:
   - For CI/CD workflows
   - Never hardcode in workflows

4. **Regular Audits**:
   - Weekly dependency updates
   - Monthly security reviews
   - Automated scanning

## 🎯 Priority Actions

1. **HIGH**: Remove `.env` files from repo
2. **HIGH**: Create `.env.example` templates
3. **MEDIUM**: Update .gitignore
4. **MEDIUM**: Add SECURITY.md
5. **LOW**: Clean git history if needed

This will make your repository secure and professional for open source!