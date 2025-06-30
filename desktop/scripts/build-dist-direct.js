#!/usr/bin/env node

/**
 * Direct electron-builder execution
 * Bypasses npm workspace issues entirely
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Change to desktop directory
const desktopDir = path.resolve(__dirname, '..');
process.chdir(desktopDir);

console.log('Building distribution packages (direct mode)...');
console.log('Working directory:', process.cwd());

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

// Run electron-builder directly
const electronBuilder = spawn(electronBuilderPath, [], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // Ensure electron-builder can find its dependencies
    NODE_PATH: [
      path.join(desktopDir, 'node_modules'),
      path.join(desktopDir, '..', 'node_modules'),
      process.env.NODE_PATH
    ].filter(Boolean).join(path.delimiter)
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