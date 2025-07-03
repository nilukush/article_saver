# URGENT: Fix Screenshots & Umami Tracking Code

## Issue 1: Screenshots Returning 404 ❌

### The Problem
GitHub Pages cannot serve files with spaces in filenames, even with URL encoding. The files exist locally but return 404 when accessed via web.

### IMMEDIATE FIX - Do This Now:

#### Step 1: Run the Rename Script
```bash
cd /Users/nileshkumar/gh/article_saver
./rename-screenshots.sh
```

If the script doesn't work, rename manually:
```bash
cd /Users/nileshkumar/gh/article_saver/screenshots
mv "Screenshot 2025-07-03 at 7.53.37 PM.png" screenshot-1.png
mv "Screenshot 2025-07-03 at 7.53.56 PM.png" screenshot-2.png
mv "Screenshot 2025-07-03 at 7.54.01 PM.png" screenshot-3.png
mv "Screenshot 2025-07-03 at 7.54.08 PM.png" screenshot-4.png
mv "Screenshot 2025-07-03 at 8.42.17 PM.png" screenshot-5.png
```

#### Step 2: Update index.html
Replace the screenshot section with:
```html
<div class="screenshot-container">
    <img id="screenshot-list" src="screenshots/screenshot-1.png" alt="Article Saver main interface showing 5,529 imported articles with tags and search functionality" class="screenshot active">
    <img id="screenshot-import" src="screenshots/screenshot-5.png" alt="Import progress showing real-time Pocket API sync - fetching 60 articles with progress bar" class="screenshot">
    <img id="screenshot-account" src="screenshots/screenshot-2.png" alt="Account panel showing Pocket integration authorized and sync status with 3,870 unread articles" class="screenshot">
    <img id="screenshot-pocket" src="screenshots/screenshot-3.png" alt="Pocket import successful showing 5,529 articles imported with options to re-sync and manage content" class="screenshot">
    <img id="screenshot-add" src="screenshots/screenshot-4.png" alt="Add article dialog with URL input and tag management for organizing saved content" class="screenshot">
</div>
```

#### Step 3: Commit and Push
```bash
git add -A
git commit -m "Fix screenshots with simple numbered filenames"
git push origin main
```

## Issue 2: Umami Tracking Code Not Showing ❌

### Method 1: Find Your Website ID

1. **Go to your Umami dashboard**
2. **Click on "Settings" → "Websites"**
3. **Look for the Edit button** (pencil icon) next to "Article Saver"
4. **Click Edit → Tracking Code tab**

If still no code showing, try:

### Method 2: Get Website ID from URL

1. In Umami dashboard, click on "Article Saver" website
2. Look at the URL - it should contain the website ID:
   ```
   https://your-umami.vercel.app/websites/[WEBSITE-ID-HERE]
   ```
3. Copy that ID

### Method 3: Manual Tracking Code

Once you have the website ID, add this to your index.html before `</body>`:

```html
<script async defer 
  src="https://[your-umami-app].vercel.app/script.js" 
  data-website-id="[YOUR-WEBSITE-ID]">
</script>
```

Replace:
- `[your-umami-app]` with your Vercel app URL
- `[YOUR-WEBSITE-ID]` with the ID you found

### If Tracking Code Tab is Empty:

This is a known Umami v2 issue. Try these fixes:

1. **Restart Umami**:
   - Go to Vercel dashboard
   - Redeploy the application
   - Try accessing tracking code again

2. **Check Environment Variables**:
   Add these to Vercel if missing:
   ```
   TRACKER_SCRIPT_NAME=script.js
   COLLECT_API_ENDPOINT=/api/collect
   ```

3. **Direct Database Query** (Advanced):
   If you have database access, run:
   ```sql
   SELECT website_id, name, domain FROM website WHERE domain = 'nilukush.github.io';
   ```

### Alternative: Use Umami Cloud Script Format

If self-hosted isn't working, temporarily use:
```html
<script>
  // Get website ID from Umami dashboard URL
  const UMAMI_WEBSITE_ID = 'YOUR-WEBSITE-ID-HERE';
  const UMAMI_URL = 'https://your-app.vercel.app';
  
  // Dynamically load Umami
  const script = document.createElement('script');
  script.src = UMAMI_URL + '/script.js';
  script.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
</script>
```

## Quick Debug Steps:

1. **For Screenshots**:
   - Check browser console for exact 404 URLs
   - Verify files exist in GitHub repo
   - Try accessing directly: https://github.com/nilukush/article_saver/tree/main/screenshots

2. **For Umami**:
   - Check browser Network tab when visiting Umami
   - Look for any API errors
   - Verify you're logged in as admin
   - Try creating a second test website to see if tracking code appears

## Emergency Fallback:

If nothing works, use these alternatives:

**For Screenshots**: Upload to Imgur or similar and use those URLs
**For Analytics**: Use free Cloudflare Web Analytics or remove analytics temporarily

The key is getting your site functional first!