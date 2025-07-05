# Article Saver Download Dashboard

This dashboard provides real-time download statistics for Article Saver releases.

## Features

- **Total Downloads**: All-time download count across all releases
- **Weekly Stats**: Downloads in the last 7 days with growth indicators
- **Platform Distribution**: Breakdown by Windows, macOS, and Linux
- **Version Performance**: Downloads per release version
- **Growth Timeline**: Cumulative download trends over time

## How It Works

1. **Data Source**: GitHub Releases API
2. **Update Frequency**: Automatically refreshes every 5 minutes
3. **Caching**: Local browser cache to reduce API calls
4. **No Authentication**: Uses public GitHub API (60 requests/hour limit)

## Access Methods

### GitHub Pages (Recommended)
Visit: https://nilukush.github.io/article_saver/dashboard/

### Local Development
```bash
# Python 3
python3 -m http.server 8000
# Visit: http://localhost:8000/dashboard/

# Node.js
npx http-server -p 8000
# Visit: http://localhost:8000/dashboard/
```

## Technical Details

- **Framework**: Vanilla JavaScript (no dependencies except Chart.js)
- **Charts**: Chart.js 4.4.1 for visualizations
- **Styling**: Pure CSS with responsive design
- **API**: GitHub REST API v3
- **CORS**: Works on GitHub Pages (github.io domains have CORS access)

## Privacy

- No tracking or analytics on the dashboard itself
- Only fetches public download data from GitHub
- All processing happens in your browser
- Cache stored locally in browser localStorage

## Troubleshooting

### No Data Showing?
- Check internet connection
- May have hit GitHub API rate limit (60/hour for unauthenticated)
- Clear browser cache and refresh

### Charts Too Large?
- Fixed in current version with proper container sizing
- Clear cache if still seeing issues

### CORS Errors?
- Only occurs when opening HTML files directly (file://)
- Use GitHub Pages URL or local server instead

## Contributing

To update the dashboard:
1. Edit `dashboard/index.html`
2. Test locally with a web server
3. Commit and push to GitHub
4. Changes appear instantly on GitHub Pages

## Future Enhancements

- [ ] Add download velocity metrics
- [ ] Show release notes inline
- [ ] Export data as CSV
- [ ] Dark mode support
- [ ] Mobile app download tracking