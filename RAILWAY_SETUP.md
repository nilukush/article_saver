# Railway Deployment Setup

## Critical: Add RAILWAY_TOKEN to GitHub Secrets

The CI/CD pipeline requires a RAILWAY_TOKEN to deploy to Railway. Without this, the deployment will fail.

### Steps to Generate and Add Railway Token:

1. **Generate Railway Token:**
   - Go to your Railway dashboard
   - Navigate to Project Settings → Tokens
   - Click "Create New Token"
   - Give it a descriptive name (e.g., "GitHub Actions Deploy")
   - Copy the generated token immediately (it won't be shown again)

2. **Add to GitHub Repository:**
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `RAILWAY_TOKEN`
   - Value: Paste the token from Railway
   - Click "Add secret"

3. **Verify Service Name:**
   - The workflow uses service name: `article_saver`
   - Ensure this matches your Railway service name
   - Check in Railway dashboard under your project services

### Troubleshooting:

If deployment still fails:
1. Verify the token has the correct permissions
2. Check that the backend directory is linked to Railway:
   ```bash
   cd backend
   railway link
   # Select your project and service
   ```

3. Confirm service name:
   ```bash
   railway status
   ```

### Security Notes:
- Never commit the RAILWAY_TOKEN to your repository
- Rotate tokens periodically
- Use separate tokens for different environments (dev/prod)