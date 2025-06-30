#!/usr/bin/env node

/**
 * Standalone build script for electron-builder
 * Works around npm workspaces issues by running in isolated context
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Change to desktop directory
const desktopDir = path.resolve(__dirname, '..');
process.chdir(desktopDir);

console.log('Building distribution packages (standalone mode)...');
console.log('Working directory:', process.cwd());

// Create a temporary package.json without workspaces
const originalPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const tempPackageJson = { ...originalPackageJson };
delete tempPackageJson.workspaces;

// Write temporary package.json
fs.writeFileSync('package.json.backup', JSON.stringify(originalPackageJson, null, 2));
fs.writeFileSync('package.json', JSON.stringify(tempPackageJson, null, 2));

try {
  // Install electron-builder locally if not present
  if (!fs.existsSync('node_modules/electron-builder')) {
    console.log('Installing electron-builder locally...');
    execSync('npm install electron-builder@^24.9.1 --save-dev --legacy-peer-deps', { 
      stdio: 'inherit' 
    });
  }

  // Install app-builder-bin if missing
  if (!fs.existsSync('node_modules/app-builder-bin')) {
    console.log('Installing app-builder-bin locally...');
    execSync('npm install app-builder-bin@latest --save-dev', { 
      stdio: 'inherit' 
    });
  }

  // Run electron-builder directly
  console.log('Running electron-builder...');
  execSync('npx electron-builder', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      // Disable npm workspace detection
      npm_config_workspaces: 'false',
      npm_config_workspace: ''
    }
  });
  
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} finally {
  // Restore original package.json
  fs.copyFileSync('package.json.backup', 'package.json');
  fs.unlinkSync('package.json.backup');
  console.log('Restored original package.json');
}