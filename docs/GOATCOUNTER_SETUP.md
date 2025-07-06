# GoatCounter Analytics Setup Guide

Your GoatCounter analytics are now live at: https://articlesaver.goatcounter.com/

## Quick Configuration Steps

### 1. Add Your IP to Ignore List (Recommended)
This prevents your own visits from being counted:

1. Go to **Settings** → **Tracking**
2. Find the **"Ignore IPs"** section
3. Add your current IP address
4. Click **Save**

To find your IP: https://whatismyipaddress.com/

### 2. Configure Site Settings
1. Go to **Settings** → **Site Settings**
2. Set your timezone
3. Optionally add a description
4. Save changes

### 3. View Your Analytics
- **Dashboard**: https://articlesaver.goatcounter.com/
- **Real-time view**: Updates every few seconds
- **Download events**: Will appear under the "Events" section

## What's Being Tracked

### Page Views
- Homepage visits
- Downloads page visits
- Dashboard visits
- Any other pages you add tracking to

### Download Events (Custom Events)
When users click download buttons, these events are tracked:
- `download-windows-installer`
- `download-windows-portable`
- `download-macos-arm64`
- `download-macos-intel`
- `download-linux-appimage`
- `download-linux-deb`

## Privacy Features
- No cookies used
- No personal data collected
- GDPR compliant by default
- Only aggregated statistics

## Viewing Your Data

### Time Periods
- Use the date selector to view different periods
- Options: day, week, month, quarter, year
- Click "Today" to see real-time data

### Metrics Available
- **Pages**: Which pages are visited most
- **Referrers**: Where your traffic comes from
- **Countries**: Geographic distribution
- **Browsers**: What browsers people use
- **Systems**: Operating system breakdown
- **Screen sizes**: Device types
- **Events**: Download button clicks

## Tips for Better Analytics

1. **Test Different Marketing Channels**
   - Share your site on different platforms
   - Use UTM parameters to track campaigns
   - Example: `?utm_source=twitter&utm_campaign=launch`

2. **Monitor Download Patterns**
   - Check which platforms are most popular
   - See if certain versions get more downloads
   - Use this data to prioritize development

3. **Track User Journey**
   - See which pages lead to downloads
   - Identify drop-off points
   - Optimize based on user behavior

## Troubleshooting

### Not Seeing Data?
1. Check if ad blockers are disabled for testing
2. Use incognito mode to test as a new visitor
3. Make sure JavaScript is enabled
4. Wait a few seconds for data to appear

### Want to Block Your Own Visits?
Besides IP filtering, you can:
1. Visit your site with `#toggle-goatcounter` in the URL
2. Example: `https://nilukush.github.io/article_saver/#toggle-goatcounter`
3. A popup will confirm blocking is active

## Next Steps

1. Share your site to start getting real traffic
2. Monitor which platforms need the most support
3. Use the data to improve your project
4. Consider adding more custom events as needed

Your analytics are now fully set up and tracking! 🎉