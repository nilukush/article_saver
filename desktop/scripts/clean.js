#!/usr/bin/env node

/**
 * Cross-platform clean script for desktop app
 * Removes directories without requiring platform-specific commands
 */

const fs = require('fs');
const path = require('path');

function removeDirectory(dir) {
  if (fs.existsSync(dir)) {
    console.log(`Removing ${dir}...`);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`✓ Removed ${dir}`);
  } else {
    console.log(`⚠ ${dir} does not exist, skipping`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/clean.js <directories...>');
  process.exit(1);
}

// Clean each specified directory
args.forEach(dir => {
  const fullPath = path.resolve(process.cwd(), dir);
  removeDirectory(fullPath);
});

console.log('✨ Clean complete');