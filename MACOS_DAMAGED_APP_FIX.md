# Fix for "Article Saver is damaged" Error on macOS

This error occurs because Article Saver is not signed with an Apple Developer certificate. It's a standard macOS security feature, not actual damage to the app.

## Quick Fix (90% Success Rate)

Open Terminal and paste this command:

```bash
xattr -cr /Applications/Article\ Saver.app
```

Then try opening Article Saver again.

## Detailed Solutions

### Why This Happens

macOS marks all downloaded apps with a "quarantine" attribute. For unsigned apps, this triggers the "damaged" message. The app is perfectly safe - this is just Apple's way of protecting users from potentially harmful software.

### Solution 1: Remove Quarantine (Recommended)

1. Open Terminal (found in Applications → Utilities)
2. Copy and paste this command:
   ```bash
   xattr -cr /Applications/Article\ Saver.app
   ```
3. Press Enter
4. Try opening Article Saver again

### Solution 2: Right-Click Method

1. In Finder, go to Applications
2. Find Article Saver
3. **Right-click** (or Control-click) on Article Saver
4. Select **"Open"** from the menu
5. A dialog will appear warning about the app
6. Click **"Open"** in the dialog
7. Enter your password if prompted

### Solution 3: System Settings Method

1. Try to open Article Saver (it will show the error)
2. Open **System Settings** (or System Preferences on older macOS)
3. Go to **Privacy & Security**
4. In the Security section, you should see: "Article Saver was blocked from use because it is not from an identified developer"
5. Click **"Open Anyway"**
6. Enter your password
7. Try opening Article Saver again
8. Click "Open" in the confirmation dialog

### Solution 4: For Persistent Issues

If the above don't work, try this sequence:

1. Delete Article Saver from Applications
2. Empty Trash
3. Re-download the correct version:
   - Intel Macs: `Article.Saver-1.1.0.dmg`
   - Apple Silicon (M1/M2/M3): `Article.Saver-1.1.0-arm64.dmg`
4. Open the DMG file
5. Before dragging to Applications, right-click Article Saver in the DMG window and select "Open"
6. When it fails, now drag to Applications
7. Use Solution 1 or 2 above

### Solution 5: Advanced Terminal Method

If all else fails, temporarily disable Gatekeeper:

```bash
# Disable Gatekeeper
sudo spctl --master-disable

# Open Article Saver

# Re-enable Gatekeeper (important!)
sudo spctl --master-enable
```

**Warning**: Only disable Gatekeeper temporarily and re-enable it immediately after opening Article Saver.

## Verification Steps

After successfully opening Article Saver:

1. The app should launch normally
2. You should see the main window
3. Future launches won't show the error
4. The security exception is saved

## Prevention for Future Releases

This issue will be resolved in future versions when we implement code signing. For now, these workarounds are necessary for all users.

## Still Having Issues?

If none of these solutions work:

1. Check your macOS version (Article Saver requires macOS 10.13 or later)
2. Ensure you downloaded the correct version (arm64 for Apple Silicon, regular for Intel)
3. Check if your organization has additional security policies
4. Report the issue at: https://github.com/nilukush/article_saver/issues

## Technical Details

The error occurs because:
- Article Saver is not signed with an Apple Developer ID ($99/year)
- macOS Gatekeeper blocks unsigned apps by default
- The quarantine extended attribute (`com.apple.quarantine`) triggers the check
- The `xattr -cr` command removes this attribute recursively

This is a security feature, not a bug. The app is safe to use.