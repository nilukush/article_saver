# Electron Blank Screen Debugging Guide

## Problem Description
The Electron app shows a blank white screen after installation on macOS. The app opens but displays nothing, even though logs show the database is initialized.

## Root Cause
The issue is related to incorrect path resolution when loading the renderer HTML file in production builds, especially when the app is packaged as an asar archive.

## Path Structure Analysis

### Development Structure
```
desktop/
├── src/
│   ├── main/
│   │   └── main.ts
│   └── renderer/
│       └── index.html
```

### Build Structure
```
dist/
├── main/
│   └── desktop/
│       └── src/
│           └── main/
│               └── main.js    # Main process entry
└── renderer/
    └── index.html            # Renderer HTML
```

### Packaged App Structure (in asar)
```
app.asar/
├── dist/
│   ├── main/
│   └── renderer/
├── node_modules/
└── package.json
```

## Solution Implemented

The fix involves using proper path resolution that handles both packaged and unpackaged scenarios:

```typescript
if (app.isPackaged) {
    // When packaged in asar
    indexPath = path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')
} else {
    // When running from dist folder
    indexPath = path.join(__dirname, '../../../../../renderer/index.html')
}
```

## Additional Debugging Steps

1. **Enable Console Logging**: The updated code logs all renderer console messages to help identify JavaScript errors.

2. **DOM Ready Check**: Added code to verify if the DOM loads and React mounts properly.

3. **Path Logging**: Extensive logging of paths helps identify resolution issues.

## Testing the Fix

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Package the app**:
   ```bash
   npm run dist
   ```

3. **Check logs** at:
   ```
   ~/Library/Application Support/Article Saver/logs/
   ```

4. **Look for these key log entries**:
   - "Loading production app from:" - Shows the resolved path
   - "DOM ready event fired" - Confirms HTML loaded
   - "Page loaded, checking for React app..." - Verifies JavaScript execution

## Common Issues and Solutions

### Issue 1: CSS/JS Assets Not Loading
- **Symptom**: HTML loads but no styles or JavaScript
- **Cause**: Incorrect base path in Vite build
- **Solution**: Ensure `base: './'` in vite.config.ts

### Issue 2: File Protocol Security
- **Symptom**: "Not allowed to load local resource" errors
- **Cause**: Electron security restrictions
- **Solution**: Use `loadFile()` instead of `loadURL()` with file:// protocol

### Issue 3: ASAR Path Resolution
- **Symptom**: File not found errors in packaged app
- **Cause**: Different path structure in asar vs unpacked
- **Solution**: Use `app.getAppPath()` for packaged apps

## Verification Steps

1. **Check if HTML loads**:
   - Open DevTools (if enabled)
   - Check Network tab for 404 errors
   - Verify Console for JavaScript errors

2. **Verify paths in logs**:
   - `__dirname` should show the main.js location
   - `indexPath` should resolve to actual HTML file
   - `appPath` shows the asar or app directory

3. **Test in different scenarios**:
   - Development: `npm run dev`
   - Built but not packaged: `npm run build && electron .`
   - Packaged: Install from DMG and run

## Emergency Fixes

If the app still shows blank screen:

1. **Enable DevTools temporarily**:
   ```typescript
   webPreferences: {
       devTools: true, // Enable for debugging
   }
   ```

2. **Add verbose logging**:
   ```typescript
   logger.info('All paths:', {
       __dirname,
       __filename,
       cwd: process.cwd(),
       appPath: app.getAppPath(),
       resourcesPath: process.resourcesPath,
       exePath: app.getPath('exe')
   })
   ```

3. **Try absolute paths**:
   ```typescript
   const indexPath = '/Applications/Article Saver.app/Contents/Resources/app.asar/dist/renderer/index.html'
   ```

## Prevention

1. Always test production builds before release
2. Include path logging in production for debugging
3. Test on clean systems without development environment
4. Verify electron-builder file patterns include all necessary files