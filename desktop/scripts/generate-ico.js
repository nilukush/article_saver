#!/usr/bin/env node

/**
 * Generate Windows ICO file from PNG images
 * This script creates a proper ICO file for Windows builds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iconsDir = path.join(__dirname, '..', 'resources', 'icons');
const outputIco = path.join(iconsDir, 'icon.ico');

console.log('Generating Windows ICO file...');

// Check if ImageMagick is available
let hasImageMagick = false;
try {
  execSync('convert --version', { stdio: 'ignore' });
  hasImageMagick = true;
  console.log('✅ ImageMagick found');
} catch (e) {
  console.log('⚠️  ImageMagick not found, trying alternative methods...');
}

// Check if we have all required PNG files
const requiredSizes = ['16x16', '32x32', '64x64', '128x128', '256x256'];
const availablePngs = [];

for (const size of requiredSizes) {
  const pngPath = path.join(iconsDir, `${size}.png`);
  if (fs.existsSync(pngPath)) {
    availablePngs.push(pngPath);
    console.log(`✅ Found ${size}.png`);
  } else {
    console.log(`❌ Missing ${size}.png`);
  }
}

if (availablePngs.length === 0) {
  console.error('❌ No PNG files found for ICO generation');
  process.exit(1);
}

// Method 1: Use ImageMagick if available
if (hasImageMagick) {
  try {
    const command = `convert ${availablePngs.join(' ')} ${outputIco}`;
    console.log('Running:', command);
    execSync(command, { stdio: 'inherit' });
    console.log('✅ ICO file generated successfully with ImageMagick');
    process.exit(0);
  } catch (e) {
    console.error('❌ ImageMagick conversion failed:', e.message);
  }
}

// Method 2: Try using electron-icon-builder if installed
try {
  execSync('npx --no -- electron-icon-builder --version', { stdio: 'ignore' });
  console.log('Trying electron-icon-builder...');
  
  // Create a temporary input PNG if we don't have icon.png
  const inputPng = path.join(iconsDir, 'icon.png');
  if (!fs.existsSync(inputPng)) {
    // Use the largest available PNG
    const largestPng = availablePngs[availablePngs.length - 1];
    fs.copyFileSync(largestPng, inputPng);
  }
  
  const command = `npx --no -- electron-icon-builder --input=${inputPng} --output=${iconsDir}`;
  execSync(command, { stdio: 'inherit' });
  console.log('✅ ICO file generated successfully with electron-icon-builder');
  process.exit(0);
} catch (e) {
  console.log('⚠️  electron-icon-builder not available');
}

// Method 3: Manual ICO creation (basic implementation)
console.log('Creating basic ICO file manually...');

// For now, we'll create a simple instruction file
const instructions = `
To create a proper Windows ICO file, you need to:

1. Install ImageMagick:
   - macOS: brew install imagemagick
   - Windows: Download from https://imagemagick.org/script/download.php
   - Linux: sudo apt-get install imagemagick

2. Run this command from the desktop directory:
   convert resources/icons/16x16.png resources/icons/32x32.png resources/icons/64x64.png resources/icons/128x128.png resources/icons/256x256.png resources/icons/icon.ico

OR

1. Install electron-icon-builder globally:
   npm install -g electron-icon-builder

2. Run this command from the desktop directory:
   electron-icon-builder --input=resources/icons/icon.png --output=resources/icons

OR

Use an online ICO converter:
1. Go to https://www.icoconverter.com/
2. Upload the 256x256.png file
3. Select all sizes (16, 32, 48, 64, 128, 256)
4. Download and save as icon.ico in desktop/resources/icons/
`;

fs.writeFileSync(path.join(iconsDir, 'ICO_GENERATION_INSTRUCTIONS.txt'), instructions);
console.log('❌ Could not generate ICO automatically.');
console.log('📝 Instructions saved to resources/icons/ICO_GENERATION_INSTRUCTIONS.txt');
process.exit(1);