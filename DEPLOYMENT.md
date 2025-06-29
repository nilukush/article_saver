# Deployment Guide

## Backend Deployment (Railway)

The backend API is deployed to Railway. To enable automatic deployment through GitHub Actions:

### Setting up RAILWAY_TOKEN

1. **Get your Railway token**:
   - Log in to [Railway](https://railway.app)
   - Go to your project dashboard
   - Click on your project settings
   - Navigate to "Tokens" section
   - Create a new project token (NOT an account token)
   - Copy the token value

2. **Add token to GitHub**:
   - Go to your repository: https://github.com/nilukush/article_saver
   - Click on **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `RAILWAY_TOKEN`
   - Value: Paste your Railway project token
   - Click **Add secret**

3. **Verify deployment**:
   - Push any change to the `main` branch
   - Check GitHub Actions: https://github.com/nilukush/article_saver/actions
   - The "Deploy Backend" job should now pass

### Important Notes:
- Use a PROJECT token, not an account token
- The token should have deployment permissions
- Keep the token secure and never commit it to the repository
- The backend will only deploy on pushes to the `main` branch

## Desktop App Release

The desktop app builds automatically for all platforms:
- Windows: `.exe` installer
- macOS: `.dmg` disk image  
- Linux: `.AppImage` and `.deb` packages

These are available as artifacts in successful workflow runs.

### Manual Release Process

To create a new release with version tag:

1. Update version in `desktop/package.json`
2. Commit the change
3. Create and push a version tag:
   ```bash
   git tag v1.0.3
   git push origin v1.0.3
   ```
4. The workflow will automatically create a GitHub release with all platform builds

### Urgent: Pocket Shutdown July 7, 2025

With Pocket shutting down, ensure desktop app releases are distributed to users before this date.