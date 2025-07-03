# Installation Guide - Article Saver

## 🚨 Pocket is shutting down July 7, 2025!
**Import your articles NOW before it's too late!**

## Download Links

Download the latest version (v1.1.3) from our [GitHub Releases page](https://github.com/nilukush/article_saver/releases/latest).

Choose the appropriate file for your platform:

### Windows
- **Installer (Recommended)**: `Article.Saver.Setup.1.1.3.exe` - Standard Windows installer
- **Portable**: `Article.Saver.1.1.3.exe` - No installation required

### macOS
- **Intel Macs**: `Article.Saver-1.1.3.dmg`
- **Apple Silicon (M1/M2/M3)**: `Article.Saver-1.1.3-arm64.dmg`

### Linux
- **AppImage (Universal)**: `Article.Saver-1.1.3.AppImage` - Works on most distributions
- **Debian/Ubuntu**: `article-saver-desktop_1.1.3_amd64.deb`

---

## Installation Instructions

### 🪟 Windows Installation

When you run the installer, Windows SmartScreen may show a warning.

**To install:**

1. Download `Article.Saver.Setup.1.1.0.exe`
2. Double-click the downloaded file
3. If you see "Windows protected your PC":
   - Click **"More info"**
   - Click **"Run anyway"**
4. Follow the installer prompts
5. Launch Article Saver from your Start Menu

**Alternative for portable version:**
- Download `Article.Saver.1.1.0.exe`
- Place it in any folder
- Right-click → Properties → Check "Unblock" → OK
- Double-click to run

### 🍎 macOS Installation

macOS Gatekeeper will block the app as it's from an "unidentified developer".

> **⚠️ Getting "Article Saver is damaged" error?** This is a common macOS security feature, not actual damage. See our [detailed fix guide](MACOS_DAMAGED_APP_FIX.md) or use this quick fix:
> ```bash
> xattr -cr /Applications/Article\ Saver.app
> ```

**To install:**

1. Download the appropriate `.dmg` file for your Mac:
   - **Intel Macs**: `Article.Saver-1.1.0.dmg`
   - **Apple Silicon (M1/M2/M3)**: `Article.Saver-1.1.0-arm64.dmg`
2. Double-click the `.dmg` to mount it
3. Drag Article Saver to your Applications folder
4. **IMPORTANT**: Don't double-click to open yet!
5. **First-time opening:**
   - Right-click (or Control-click) Article Saver in Applications
   - Select **"Open"** from the context menu
   - Click **"Open"** in the dialog that appears
6. After the first time, you can open normally

**If you see "damaged and can't be opened":**
1. Open Terminal (in Applications → Utilities)
2. Run: `xattr -cr /Applications/Article\ Saver.app`
3. Try opening again

**If you still can't open:**
- Go to System Settings → Privacy & Security
- Look for "Article Saver was blocked"
- Click "Open Anyway"
- Enter your password when prompted

### 🐧 Linux Installation

#### AppImage (Recommended)
```bash
# Download the AppImage
# Install required dependency first
sudo apt install libfuse2  # Ubuntu/Debian
sudo dnf install fuse      # Fedora

# Download the AppImage
wget https://github.com/nilukush/article_saver/releases/download/v1.1.3/Article.Saver-1.1.3.AppImage

# Make it executable
chmod +x Article.Saver-1.1.3.AppImage

# Run it
./Article.Saver-1.1.3.AppImage
```

**Desktop integration (optional):**
- Install [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher) for better integration
- Or manually create a `.desktop` file in `~/.local/share/applications/`

#### Debian/Ubuntu (.deb)
```bash
# Download the .deb package
wget https://github.com/nilukush/article_saver/releases/download/v1.1.0/article-saver-desktop_1.1.0_amd64.deb

# Install with dpkg
sudo dpkg -i article-saver-desktop_1.1.0_amd64.deb

# Fix any dependency issues
sudo apt-get install -f

# Launch from your application menu or terminal
article-saver-desktop
```

---

## 🚀 After Installation

1. **Launch Article Saver**
2. **Click "Import from Pocket"** in Settings
3. **Authenticate with your Pocket account**
4. **Wait for import to complete** (progress shown in header)
5. **Your articles are now safe!**

## 🔄 Auto-Updates

Article Saver will automatically check for updates every hour. When an update is available:
- You'll see a notification
- Click "Restart to Update" when prompted
- The app will update and restart automatically

## ❓ Troubleshooting

### "Unidentified Developer" or "Unknown Publisher" warnings
These warnings appear because this is an urgent release without code signing certificates. The app is safe to use - these warnings are standard for unsigned applications.

### Cannot open on macOS
- Make sure to right-click and select "Open" for first launch
- Check System Preferences → Security & Privacy → General
- Try running: `xattr -cr /Applications/Article\ Saver.app` in Terminal

### Linux permission denied
```bash
chmod +x Article.Saver-1.1.3.AppImage
```

### Windows Defender blocks the app
- This is rare but can happen with unsigned apps
- Add an exception in Windows Defender
- Or use the portable version instead of installer

## 🔒 Security Note

**Why is this app unsigned?**
Due to the urgent Pocket shutdown deadline (July 7, 2025), we've released this version without code signing certificates to ensure you can import your articles in time. Code signing requires:
- Apple Developer Program enrollment ($99/year) with 1-2 week processing
- Windows EV Certificate ($300-500) with 1-3 week processing

Future releases will be properly signed. The source code is open and available for review at https://github.com/nilukush/article_saver.

## ✅ Verify Installation

After installation, verify everything is working:

1. **Launch the application**
   - Windows: Start Menu → Article Saver
   - macOS: Applications → Article Saver
   - Linux: Run the AppImage or use your app launcher

2. **Check the version**
   - Go to Settings → About
   - Should show version 1.1.3 or later

3. **Test basic functionality**
   - Try adding an article from URL
   - Check if search works
   - Verify settings can be opened

4. **Verify backend connection**
   - If using cloud sync, check Settings → Account
   - Should show "Connected" status

## 🔒 Download Verification

For security-conscious users, verify your download:

### File Sizes
- Windows Installer: ~140 MB
- Windows Portable: ~140 MB  
- macOS DMG: ~200 MB
- Linux AppImage: ~150 MB
- Linux DEB: ~100 MB

### Verify GitHub Release
1. Check you're downloading from: `github.com/nilukush/article_saver`
2. Verify the release is from the official repository
3. Check the release date and notes

## 🔄 Updating from Previous Versions

If you have an older version installed:

1. **Backup your data** (optional but recommended)
   - Your articles are stored locally and won't be lost
   - Export function available in Settings

2. **Install over existing version**
   - Windows/macOS: Run the new installer
   - Linux: Replace the AppImage file

3. **Auto-update** is available for future versions

## 📞 Need Help?

- **Documentation**: [GitHub Wiki](https://github.com/nilukush/article_saver/wiki)
- **Report issues**: [GitHub Issues](https://github.com/nilukush/article_saver/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nilukush/article_saver/discussions)
- **Source code**: [GitHub Repository](https://github.com/nilukush/article_saver)

---

**🚨 Remember: Import your Pocket articles NOW! Pocket shuts down July 7, 2025!**