# 🖥️ Article Saver Desktop Distribution Guide

> Complete guide for distributing Article Saver desktop app across Windows, macOS, and Linux with zero to minimal cost

## 📋 Quick Start Checklist

- [ ] Configure `electron-builder` in package.json
- [ ] Set up GitHub Actions for automated builds
- [ ] Create GitHub repository secrets
- [ ] Configure auto-updates
- [ ] Create first release
- [ ] Test installation on all platforms

## 🎯 Distribution Strategy

### Primary Method: GitHub Releases (Free)
- **Cost**: $0
- **Platforms**: Windows, macOS, Linux
- **Auto-updates**: Yes, free
- **Download stats**: Yes
- **CDN**: GitHub's global CDN

## 📦 Step 1: Configure Electron Builder

Update `desktop/package.json`:

```json
{
  "name": "article-saver",
  "version": "1.0.0",
  "description": "Save and organize articles from across the web",
  "main": "dist/main/main.js",
  "author": "Article Saver Team",
  "license": "MIT",
  "build": {
    "appId": "com.articlesaver.app",
    "productName": "Article Saver",
    "directories": {
      "output": "release",
      "buildResources": "build"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "publish": {
      "provider": "github",
      "owner": "nilukush",
      "repo": "article_saver",
      "releaseType": "release"
    },
    "mac": {
      "category": "public.app-category.productivity",
      "icon": "build/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "notarize": false
    },
    "dmg": {
      "contents": [
        {
          "x": 410,
          "y": 150,
          "type": "link",
          "path": "/Applications"
        },
        {
          "x": 130,
          "y": 150,
          "type": "file"
        }
      ]
    },
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowElevation": true,
      "allowToChangeInstallationDirectory": true,
      "deleteAppDataOnUninstall": true
    },
    "linux": {
      "target": [
        "AppImage",
        "snap",
        "deb"
      ],
      "category": "Utility",
      "icon": "build/icon.png"
    }
  }
}
```

## 🔧 Step 2: Create Build Resources

Create icon files in `desktop/build/`:

```bash
# Create build directory
mkdir -p desktop/build

# Icon requirements:
# - icon.ico (Windows): 256x256
# - icon.icns (macOS): 1024x1024
# - icon.png (Linux): 512x512
```

## 🤖 Step 3: GitHub Actions Workflow

Create `.github/workflows/desktop-release.yml`:

```yaml
name: Desktop App Release

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:

jobs:
  release:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    
    steps:
      - name: Check out Git repository
        uses: actions/checkout@v4
        
      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install dependencies
        run: |
          npm install -g npm@latest
          cd desktop
          npm ci
          
      - name: Build TypeScript
        run: |
          cd desktop
          npm run build:prod
          
      - name: Build/release Electron app
        uses: samuelmeuli/action-electron-builder@v1
        with:
          # GitHub token, automatically provided to the action
          github_token: ${{ secrets.github_token }}
          
          # If the commit is tagged with a version (e.g. "v1.0.0"),
          # release the app after building
          release: ${{ startsWith(github.ref, 'refs/tags/v') }}
          
          # Work in desktop directory
          package_root: desktop
          
        env:
          # macOS code signing (optional for now)
          # CSC_LINK: ${{ secrets.mac_certs }}
          # CSC_KEY_PASSWORD: ${{ secrets.mac_certs_password }}
          # APPLE_ID: ${{ secrets.APPLE_ID }}
          # APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          
          # Windows code signing (optional for now)
          # CSC_LINK: ${{ secrets.windows_certs }}
          # CSC_KEY_PASSWORD: ${{ secrets.windows_certs_password }}
          
          # Required for auto-updater
          GH_TOKEN: ${{ secrets.github_token }}
```

## 🔄 Step 4: Configure Auto-Updates

### Option A: Simple GitHub Updates (Recommended)

Install the package:
```bash
cd desktop
npm install update-electron-app
```

Add to `desktop/src/main/main.ts`:
```typescript
import { updateElectronApp } from 'update-electron-app';

// Configure auto-updates
updateElectronApp({
  repo: 'nilukush/article_saver',
  updateInterval: '1 hour'
});
```

### Option B: Advanced Updates with electron-updater

Install the package:
```bash
cd desktop
npm install electron-updater
```

Add to `desktop/src/main/main.ts`:
```typescript
import { autoUpdater } from 'electron-updater';

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

// Optional: Handle update events
autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: 'A new version of Article Saver is available. It will be downloaded in the background.',
    buttons: ['OK']
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update ready',
    message: 'A new version has been downloaded. Restart the app to apply the update.',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

## 🚀 Step 5: Create Your First Release

### 1. Update Version
```bash
cd desktop
npm version 1.0.0
```

### 2. Commit and Tag
```bash
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

### 3. GitHub Actions will automatically:
- Build for Windows, macOS, and Linux
- Create a GitHub release
- Upload all installers
- Generate release notes

## 💰 Code Signing (Optional but Recommended)

### Free/Low-Cost Options

#### Windows
1. **No signing** (Free):
   - Users will see "Unknown publisher" warning
   - Works fine for open-source projects

2. **Azure Trusted Signing** ($12/year):
   - Professional signing
   - No SmartScreen warnings
   - Requires business entity

#### macOS
1. **No signing** (Free):
   - Users must right-click and select "Open"
   - Shows security warning

2. **Apple Developer** ($99/year):
   - Required for smooth installation
   - Enables auto-updates without warnings

#### Linux
- **No signing required** (Free)
- All distributions work without signing

## 📊 Platform-Specific Distribution

### Windows Distribution
1. **Direct download**: `.exe` installer from GitHub
2. **Portable version**: `.zip` archive
3. **Microsoft Store**: $19 one-time fee (optional)

### macOS Distribution
1. **Direct download**: `.dmg` installer
2. **Mac App Store**: Requires $99/year developer account
3. **Homebrew Cask**: Free, community-maintained

### Linux Distribution
1. **AppImage**: Universal, portable format
2. **Snap Store**: `snapcraft.io` (free)
3. **Flathub**: `flathub.org` (free)
4. **AUR**: Arch Linux community repo (free)

## 📝 Build Commands

Add to `desktop/package.json`:
```json
{
  "scripts": {
    "dist": "electron-builder",
    "dist:win": "electron-builder --win",
    "dist:mac": "electron-builder --mac",
    "dist:linux": "electron-builder --linux",
    "dist:all": "electron-builder -mwl",
    "release": "electron-builder --publish onTag"
  }
}
```

## 🌐 Download Page

Create a simple GitHub Pages site for downloads:

1. Create `docs/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Article Saver - Download</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; }
        .download { margin: 20px 0; }
        .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Download Article Saver</h1>
    <p>Save and organize articles from across the web</p>
    
    <div class="download">
        <h2>Windows</h2>
        <a href="https://github.com/nilukush/article_saver/releases/latest/download/Article-Saver-Setup-1.0.0.exe" class="button">Download for Windows</a>
    </div>
    
    <div class="download">
        <h2>macOS</h2>
        <a href="https://github.com/nilukush/article_saver/releases/latest/download/Article-Saver-1.0.0.dmg" class="button">Download for macOS</a>
    </div>
    
    <div class="download">
        <h2>Linux</h2>
        <a href="https://github.com/nilukush/article_saver/releases/latest/download/Article-Saver-1.0.0.AppImage" class="button">Download AppImage</a>
        <a href="https://github.com/nilukush/article_saver/releases/latest/download/article-saver_1.0.0_amd64.deb" class="button">Download .deb</a>
    </div>
</body>
</html>
```

2. Enable GitHub Pages in repository settings

## 🎯 Total Cost Breakdown

### Minimum (Open Source)
- **GitHub**: $0
- **Distribution**: $0
- **Auto-updates**: $0
- **Total**: $0/year

### Professional (Recommended)
- **Windows signing**: $12/year (Azure)
- **macOS signing**: $99/year (Apple)
- **Total**: $111/year

## 📈 Scaling Strategy

1. **Start with**: GitHub releases only (free)
2. **Add when ready**: Code signing ($111/year)
3. **Consider later**: Platform stores, custom domain
4. **Track**: Download stats, user feedback

## 🚨 Important Notes

1. **Version Management**: Use semantic versioning (1.0.0)
2. **Release Notes**: Auto-generated from commits
3. **Beta Testing**: Use pre-release tags (v1.0.0-beta.1)
4. **Rollback**: Keep previous versions available
5. **Analytics**: Consider privacy-friendly analytics

## 🎉 You're Ready!

With this setup, you can distribute Article Saver professionally across all platforms for $0-111/year. The GitHub Actions workflow handles all the complexity, and users get automatic updates!