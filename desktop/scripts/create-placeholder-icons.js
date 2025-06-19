#!/usr/bin/env node

/**
 * Creates placeholder icon files for Article Saver
 * These are simple placeholders until proper icons are generated
 */

const fs = require('fs');
const path = require('path');

// Ensure icons directory exists
const iconsDir = path.join(__dirname, '../resources/icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy SVG as placeholder for different sizes
const svgPath = path.join(__dirname, '../public/logo.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Create placeholder PNG files (these are actually SVG content but named as PNG)
// This is temporary until proper conversion is done
const sizes = [16, 32, 64, 128, 256, 512, 1024];
sizes.forEach(size => {
    const filename = `${size}x${size}.png`;
    const filepath = path.join(iconsDir, filename);
    
    // For now, just copy the SVG content as a placeholder
    // In production, these should be properly converted PNGs
    fs.writeFileSync(filepath, svgContent);
    console.log(`Created placeholder: ${filename}`);
});

// Create a simple ICO placeholder (Windows)
// Note: This is not a real ICO file, just a placeholder
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), svgContent);
console.log('Created placeholder: icon.ico');

// Create a simple ICNS placeholder (macOS)
// Note: This is not a real ICNS file, just a placeholder
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), svgContent);
console.log('Created placeholder: icon.icns');

console.log('\n⚠️  IMPORTANT: These are placeholder files!');
console.log('For production, please generate proper icon files using:');
console.log('- Online converters (CloudConvert, ConvertIO)');
console.log('- ImageMagick: brew install imagemagick');
console.log('- Or professional design tools\n');

console.log('The logo SVG is located at: desktop/public/logo.svg');
console.log('Use this to generate proper icons in the required formats.');