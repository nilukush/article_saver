#!/usr/bin/env node

/**
 * Direct electron-builder execution
 * Bypasses npm workspace issues entirely
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Change to desktop directory
const desktopDir = path.resolve(__dirname, '..');
process.chdir(desktopDir);

console.log('Building distribution packages (direct mode)...');
console.log('Working directory:', process.cwd());

// Ensure app-builder-bin is available for the correct architecture
try {
  console.log('Checking app-builder-bin setup...');
  execSync('node scripts/ensure-app-builder.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to ensure app-builder-bin:', error.message);
  process.exit(1);
}

// Find electron-builder executable
const electronBuilderPaths = [
  path.join(desktopDir, 'node_modules', '.bin', 'electron-builder'),
  path.join(desktopDir, 'node_modules', '.bin', 'electron-builder.cmd'),
  path.join(desktopDir, '..', 'node_modules', '.bin', 'electron-builder'),
  path.join(desktopDir, '..', 'node_modules', '.bin', 'electron-builder.cmd'),
];

let electronBuilderPath = null;
for (const ePath of electronBuilderPaths) {
  if (fs.existsSync(ePath)) {
    electronBuilderPath = ePath;
    break;
  }
}

if (!electronBuilderPath) {
  console.error('❌ electron-builder not found in node_modules');
  console.error('Searched paths:', electronBuilderPaths);
  process.exit(1);
}

console.log('Found electron-builder at:', electronBuilderPath);

// Detect if we're on CI and need to force x64 architecture
const isCI = process.env.CI === 'true';
const isMac = process.platform === 'darwin';

// Build arguments for electron-builder
const args = [];
if (isCI && isMac) {
  // Force x64 architecture on CI for macOS
  console.log('CI detected on macOS - forcing x64 architecture');
  args.push('--x64');
}

// Run electron-builder directly
const electronBuilder = spawn(electronBuilderPath, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // Ensure electron-builder can find its dependencies
    NODE_PATH: [
      path.join(desktopDir, 'node_modules'),
      path.join(desktopDir, '..', 'node_modules'),
      process.env.NODE_PATH
    ].filter(Boolean).join(path.delimiter),
    // Force npm architecture to match CI runner
    npm_config_arch: isCI && isMac ? 'x64' : process.env.npm_config_arch,
    npm_config_target_arch: isCI && isMac ? 'x64' : process.env.npm_config_target_arch
  }
});

electronBuilder.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully');
  } else {
    console.error('❌ Build failed with exit code:', code);
    process.exit(code);
  }
});

electronBuilder.on('error', (error) => {
  console.error('❌ Failed to start electron-builder:', error);
  process.exit(1);
});