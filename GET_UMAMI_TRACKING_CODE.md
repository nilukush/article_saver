# How to Get Umami Tracking Code - Simple Steps

## Method 1: Check Website List (Easiest)

1. **Go to Umami Dashboard**
2. **Look at the main page** - you should see "Article Saver" listed
3. **Click on "Article Saver"** - this opens the analytics view
4. **Check the URL** in your browser:
   ```
   https://your-umami.vercel.app/websites/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                                              ↑ This is your website ID
   ```

## Method 2: Settings Page

1. Go to **Settings** (gear icon)
2. Click **Websites** tab
3. Find "Article Saver" in the list
4. Click the **three dots menu** (⋮) or **Edit button**
5. Select **"Get tracking code"** or go to **"Tracking code"** tab

## Method 3: If No Tracking Code Tab

Sometimes Umami v2 doesn't show the tracking code tab. Here's the manual format:

```html
<script defer src="https://YOUR-UMAMI-APP.vercel.app/script.js" data-website-id="YOUR-WEBSITE-ID"></script>
```

Example with common Umami setup:
```html
<script defer src="https://article-saver-analytics.vercel.app/script.js" data-website-id="4fb7fa4c-5b46-438d-94b3-3a8fb9bc2e8b"></script>
```

## Where to Add the Code

Add it to your `index.html` just before `</body>`:

```html
    <!-- Remove or comment out Plausible -->
    <!-- <script defer data-domain="nilukush.github.io" src="https://plausible.io/js/script.js"></script> -->
    
    <!-- Add Umami -->
    <script defer src="https://YOUR-UMAMI.vercel.app/script.js" data-website-id="YOUR-ID"></script>
</body>
</html>
```

## Quick Test

After adding the script:
1. Push to GitHub
2. Visit your site
3. Go back to Umami dashboard
4. You should see "1 current visitor" (you!)

## If You Can't Find Website ID

Look for any of these in Umami:
- A UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- In the browser URL when viewing the website stats
- In the website list table (might be a column)
- When hovering over the website name

The ID is always a UUID format string!