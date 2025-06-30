#!/usr/bin/env node

/**
 * Ensures app-builder-bin is available for the correct architecture
 * Handles architecture mismatches in CI environments
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Ensuring app-builder-bin is available...');
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('CI:', process.env.CI || 'false');

// Detect environment
const isCI = process.env.CI === 'true';
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

// Determine the correct architecture
let targetArch = process.arch;
if (isCI && isMac) {
  // GitHub Actions macOS runners are x64
  targetArch = 'x64';
  console.log('CI detected on macOS - using x64 architecture');
}

// Path to app-builder-bin in node_modules
const appBuilderPaths = [
  path.join(__dirname, '..', 'node_modules', 'app-builder-bin'),
  path.join(__dirname, '..', 'node_modules', 'builder-util', 'node_modules', 'app-builder-bin'),
  path.join(__dirname, '..', '..', 'node_modules', 'app-builder-bin'),
  path.join(__dirname, '..', '..', 'node_modules', 'builder-util', 'node_modules', 'app-builder-bin')
];

// Check if app-builder-bin exists
let appBuilderPath = null;
for (const checkPath of appBuilderPaths) {
  if (fs.existsSync(checkPath)) {
    appBuilderPath = checkPath;
    break;
  }
}

if (!appBuilderPath) {
  console.log('app-builder-bin not found, installing...');
  try {
    execSync('npm install app-builder-bin@latest --save-dev', {
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_arch: targetArch,
        npm_config_target_arch: targetArch
      }
    });
  } catch (error) {
    console.error('Failed to install app-builder-bin:', error.message);
    process.exit(1);
  }
} else {
  console.log('app-builder-bin found at:', appBuilderPath);
  
  // Check if the correct architecture binary exists
  const platformMap = {
    darwin: 'mac',
    win32: 'win',
    linux: 'linux'
  };
  
  const platform = platformMap[process.platform] || process.platform;
  const archSuffix = targetArch === 'x64' ? '' : `_${targetArch}`;
  const binaryName = isWindows ? 'app-builder.exe' : `app-builder${archSuffix}`;
  const binaryPath = path.join(appBuilderPath, platform, binaryName);
  
  if (!fs.existsSync(binaryPath)) {
    console.log(`Binary not found at ${binaryPath}, reinstalling app-builder-bin...`);
    
    // Remove existing app-builder-bin
    try {
      fs.rmSync(appBuilderPath, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to remove existing app-builder-bin:', error.message);
    }
    
    // Reinstall with correct architecture
    try {
      execSync('npm install app-builder-bin@latest --save-dev', {
        stdio: 'inherit',
        env: {
          ...process.env,
          npm_config_arch: targetArch,
          npm_config_target_arch: targetArch
        }
      });
    } catch (error) {
      console.error('Failed to reinstall app-builder-bin:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✓ app-builder binary found at:', binaryPath);
    
    // Make sure it's executable
    if (!isWindows) {
      try {
        fs.chmodSync(binaryPath, 0o755);
        console.log('✓ Made binary executable');
      } catch (error) {
        console.error('Failed to make binary executable:', error.message);
      }
    }
  }
}

console.log('✅ app-builder-bin setup complete');