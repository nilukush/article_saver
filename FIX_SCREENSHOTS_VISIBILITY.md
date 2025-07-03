# Fix Screenshots Not Showing on Website

## The Problem
Screenshots are not visible because:
1. Filenames contain spaces (e.g., "Screenshot 2025-07-03 at 7.53.37 PM.png")
2. GitHub Pages serves these files, but browsers may have issues with spaces in URLs
3. Even with URL encoding, some servers don't handle spaces well

## Solution 1: URL Encoding (Already Applied) ✅
I've updated the HTML to use URL-encoded paths:
- Spaces replaced with `%20`
- Example: `Screenshot%202025-07-03%20at%207.53.37%20PM.png`

## Solution 2: Rename Files (Recommended)
For best compatibility, rename the files to remove spaces:

### Manual Steps:
1. Open Terminal
2. Navigate to screenshots folder:
   ```bash
   cd /Users/nileshkumar/gh/article_saver/screenshots
   ```

3. Run these rename commands one by one:
   ```bash
   mv "Screenshot 2025-07-03 at 7.53.37 PM.png" screenshot-article-list.png
   mv "Screenshot 2025-07-03 at 7.53.56 PM.png" screenshot-account-panel.png  
   mv "Screenshot 2025-07-03 at 7.54.01 PM.png" screenshot-pocket-integration.png
   mv "Screenshot 2025-07-03 at 7.54.08 PM.png" screenshot-add-article.png
   mv "Screenshot 2025-07-03 at 8.42.17 PM.png" screenshot-import-progress.png
   ```

4. Or use this script to rename all at once:
   ```bash
   #!/bin/bash
   cd /Users/nileshkumar/gh/article_saver/screenshots
   
   # Array of old and new names
   declare -A renames=(
     ["Screenshot 2025-07-03 at 7.53.37 PM.png"]="screenshot-article-list.png"
     ["Screenshot 2025-07-03 at 7.53.56 PM.png"]="screenshot-account-panel.png"
     ["Screenshot 2025-07-03 at 7.54.01 PM.png"]="screenshot-pocket-integration.png"
     ["Screenshot 2025-07-03 at 7.54.08 PM.png"]="screenshot-add-article.png"
     ["Screenshot 2025-07-03 at 8.42.17 PM.png"]="screenshot-import-progress.png"
   )
   
   # Rename each file
   for old in "${!renames[@]}"; do
     new="${renames[$old]}"
     if [ -f "$old" ]; then
       mv "$old" "$new"
       echo "Renamed: $old -> $new"
     fi
   done
   ```

## After Renaming Files

Update index.html to use the new filenames:
```html
<img id="screenshot-list" src="screenshots/screenshot-article-list.png" alt="..." class="screenshot active">
<img id="screenshot-import" src="screenshots/screenshot-import-progress.png" alt="..." class="screenshot">
<img id="screenshot-account" src="screenshots/screenshot-account-panel.png" alt="..." class="screenshot">
<img id="screenshot-pocket" src="screenshots/screenshot-pocket-integration.png" alt="..." class="screenshot">
<img id="screenshot-add" src="screenshots/screenshot-add-article.png" alt="..." class="screenshot">
```

## Why This Happens

1. **GitHub Pages**: Serves static files but may have issues with special characters
2. **Browser Behavior**: Different browsers handle URL encoding differently
3. **Web Standards**: Best practice is to use web-safe filenames (no spaces, special chars)

## Quick Test

After pushing changes:
1. Force refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Check browser console for 404 errors
3. Try different browsers

## Alternative Solution

If renaming is difficult, create a simple copy script:
```bash
cd /Users/nileshkumar/gh/article_saver/screenshots
for file in Screenshot*.png; do
  # Create web-safe copy
  newname=$(echo "$file" | sed 's/ /-/g' | sed 's/Screenshot-/screenshot-/g' | tr '[:upper:]' '[:lower:]')
  cp "$file" "$newname"
done
```

This creates copies with web-safe names while keeping originals.