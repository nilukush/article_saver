# Article Saver Icons

Place your application icons in this directory:

## Required Icon Files

### Windows
- `icon.ico` - Windows icon file (256x256 recommended)
  - Should contain multiple sizes: 16x16, 32x32, 48x48, 256x256

### macOS  
- `icon.icns` - macOS icon file
  - Should contain all required sizes for macOS (up to 1024x1024)

### Linux
- `icon.png` - PNG icon (512x512 recommended)
- Optional: Multiple PNG files for different sizes:
  - `16x16.png`
  - `32x32.png`
  - `48x48.png`
  - `64x64.png`
  - `128x128.png`
  - `256x256.png`
  - `512x512.png`

## Creating Icons

### Free Tools
1. **GIMP** - Create and export to all formats
2. **Inkscape** - Create SVG and export to PNG
3. **Online converters**:
   - https://convertio.co/png-ico/
   - https://cloudconvert.com/png-to-icns

### From a Single PNG
If you have a 1024x1024 PNG, you can generate all formats:

```bash
# Install ImageMagick
brew install imagemagick  # macOS
sudo apt-get install imagemagick  # Linux

# Generate Windows ICO
convert icon.png -define icon:auto-resize=256,48,32,16 icon.ico

# Generate macOS ICNS (requires iconutil on macOS)
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```

## Temporary Icons
For testing, you can use a simple colored square or download free icons from:
- https://icons8.com
- https://www.flaticon.com
- https://iconarchive.com