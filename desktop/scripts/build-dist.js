#!/usr/bin/env node

/**
 * Build distribution packages using electron-builder
 * Works around npm workspaces issues with electron-builder
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Change to desktop directory
const desktopDir = path.resolve(__dirname, '..');
process.chdir(desktopDir);

console.log('Building distribution packages...');
console.log('Working directory:', process.cwd());

// Check if app-builder-bin exists at root
const rootAppBuilder = path.join('..', 'node_modules', 'app-builder-bin');
const localAppBuilder = path.join('node_modules', 'app-builder-bin');

if (!fs.existsSync(rootAppBuilder) && !fs.existsSync(localAppBuilder)) {
  console.log('app-builder-bin not found, installing...');
  try {
    execSync('npm install app-builder-bin@latest --no-save', { 
      stdio: 'inherit',
      cwd: path.join(desktopDir, '..')
    });
  } catch (error) {
    console.error('Failed to install app-builder-bin:', error.message);
    process.exit(1);
  }
}

// Run electron-builder
try {
  console.log('Running electron-builder...');
  execSync('npx electron-builder', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      // Ensure electron-builder can find binaries
      NODE_PATH: path.join(desktopDir, '..', 'node_modules')
    }
  });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}