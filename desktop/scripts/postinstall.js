#!/usr/bin/env node

/**
 * Postinstall script for desktop app
 * Handles electron-builder install-app-deps with proper CI detection
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Allow skipping via environment variable if needed
if (process.env.SKIP_ELECTRON_REBUILD) {
  console.log('[postinstall] Skipping electron-builder install-app-deps (SKIP_ELECTRON_REBUILD set)');
  process.exit(0);
}

// Skip if we're not in the desktop directory
if (!existsSync(path.join(process.cwd(), 'package.json'))) {
  console.log('[postinstall] Not in desktop directory, skipping');
  process.exit(0);
}

// Check if electron-builder is available
try {
  execSync('npx electron-builder --version', { stdio: 'ignore' });
} catch (error) {
  console.log('[postinstall] electron-builder not found, skipping install-app-deps');
  process.exit(0);
}

console.log('[postinstall] Running electron-builder install-app-deps...');

try {
  execSync('npx electron-builder install-app-deps', {
    stdio: 'inherit',
    timeout: 300000 // 5 minute timeout
  });
  console.log('[postinstall] Successfully completed install-app-deps');
} catch (error) {
  if (error.code === 'ETIMEDOUT') {
    console.error('[postinstall] install-app-deps timed out after 5 minutes');
  } else {
    console.error('[postinstall] install-app-deps failed:', error.message);
  }
  // Don't fail the install
  console.log('[postinstall] Continuing despite error...');
  process.exit(0);
}