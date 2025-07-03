# Google Search Console Setup Guide

## Why Google Search Console?

Google Search Console (GSC) is essential for:
- **Indexing**: Ensure Google finds your pages
- **Performance**: See which keywords bring traffic
- **Issues**: Find and fix crawl errors
- **Sitemaps**: Submit your site structure
- **100% FREE**: No cost, just a Google account

## Step-by-Step Setup Guide

### Step 1: Access Google Search Console

1. Go to: https://search.google.com/search-console
2. Sign in with your Google account
3. Click "Start now"

### Step 2: Add Your Property

You'll see "Welcome to Google Search Console"

1. Click **"Add property"**
2. Choose **URL prefix** (easier for GitHub Pages)
3. Enter: `https://nilukush.github.io/article_saver/`
4. Click **Continue**

### Step 3: Verify Ownership

Google will show several verification methods. For GitHub Pages, use **HTML file upload**:

#### Method 1: HTML File Upload (Recommended)

1. Download the HTML verification file (like `google7b8a9c7d8e5f4321.html`)
2. Add it to your repository root:

```bash
# In your article_saver directory
# Add the downloaded file
git add google7b8a9c7d8e5f4321.html  # Your actual filename
git commit -m "Add Google Search Console verification"
git push origin main
```

3. Wait 2-3 minutes for GitHub Pages to deploy
4. Click **Verify** in Google Search Console

#### Method 2: HTML Tag (Alternative)

1. Copy the meta tag provided
2. Add to your index.html inside `<head>`:

```html
<meta name="google-site-verification" content="your-verification-code-here" />
```

3. Commit and push:
```bash
git add index.html
git commit -m "Add Google Search Console verification"
git push origin main
```

4. Click **Verify**

### Step 4: Submit Sitemap

Once verified, submit your sitemap:

1. Create `sitemap.xml` in your repository root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://nilukush.github.io/article_saver/</loc>
        <lastmod>2025-07-03</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <!-- Add blog posts as you create them -->
    <url>
        <loc>https://nilukush.github.io/article_saver/blog/</loc>
        <lastmod>2025-07-03</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>
```

2. Add and push:
```bash
git add sitemap.xml
git commit -m "Add XML sitemap"
git push origin main
```

3. In Google Search Console:
   - Go to **Sitemaps** (left sidebar)
   - Enter: `sitemap.xml`
   - Click **Submit**

### Step 5: Submit for Indexing

Request immediate indexing:

1. Go to **URL Inspection** (top bar)
2. Enter: `https://nilukush.github.io/article_saver/`
3. Press Enter
4. Click **Request Indexing**

## GitHub Repository SEO Updates

### Update Repository Settings

1. Go to: https://github.com/nilukush/article_saver/settings
2. Update these fields:

**Description**:
```
🚀 Open source read-later app. Save articles with privacy in mind. One-click Pocket import. 
🌐 Website: https://nilukush.github.io/article_saver/
```

**Website**: `https://nilukush.github.io/article_saver/`

**Topics** (Add these):
- `read-later`
- `bookmark-manager`
- `pocket-alternative`
- `article-saver`
- `open-source`
- `privacy`
- `self-hosted`

### Update README.md

Add this at the very top of your README.md:

```markdown
# Article Saver

<div align="center">
  
  [![Website](https://img.shields.io/badge/Website-Live-brightgreen)](https://nilukush.github.io/article_saver/)
  [![GitHub Stars](https://img.shields.io/github/stars/nilukush/article_saver)](https://github.com/nilukush/article_saver/stargazers)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  
  **[🌐 Visit Our Website](https://nilukush.github.io/article_saver/) | [📥 Download](https://github.com/nilukush/article_saver/releases) | [📖 Documentation](https://github.com/nilukush/article_saver/wiki)**

</div>

> 🚨 **Pocket is shutting down on July 8, 2025!** Don't lose your saved articles. Article Saver offers one-click import to save your entire library.

## 🎯 Quick Links

- **Website**: https://nilukush.github.io/article_saver/
- **Download**: [Latest Release](https://github.com/nilukush/article_saver/releases)
- **Import from Pocket**: [Migration Guide](https://nilukush.github.io/article_saver/blog/migrate-from-pocket)

[Rest of your existing README...]
```

## robots.txt Setup

Create `robots.txt` in repository root:

```txt
User-agent: *
Allow: /

Sitemap: https://nilukush.github.io/article_saver/sitemap.xml

# GitHub Pages specific
User-agent: *
Disallow: /*.json$
Disallow: /.git/
```

Commit and push:
```bash
git add robots.txt
git commit -m "Add robots.txt for SEO"
git push origin main
```

## Monitoring Your Performance

### What to Check in GSC (After 3-5 days)

1. **Performance Tab**:
   - Impressions (how often you appear)
   - Clicks (actual visits)
   - CTR (click-through rate)
   - Average position

2. **Coverage Tab**:
   - Valid pages
   - Errors (fix immediately)
   - Warnings (review)

3. **Core Web Vitals**:
   - Page speed metrics
   - Mobile usability
   - User experience signals

### Setting Up Email Alerts

1. Click the gear icon (Settings)
2. Go to **Email preferences**
3. Enable alerts for:
   - Crawl errors
   - Search appearance issues
   - Manual actions

## Additional SEO Quick Wins

### 1. Rich Results Test

Test your structured data:
1. Go to: https://search.google.com/test/rich-results
2. Enter your URL
3. Fix any errors shown

### 2. Mobile-Friendly Test

Ensure mobile optimization:
1. Go to: https://search.google.com/test/mobile-friendly
2. Enter your URL
3. Should show "Page is mobile friendly"

### 3. PageSpeed Insights

Check performance:
1. Go to: https://pagespeed.web.dev/
2. Enter your URL
3. Aim for 90+ score

## Troubleshooting

### Verification Failed?
- Wait 5 minutes after pushing files
- Check file is in root directory
- Ensure exact filename match
- Try alternative verification method

### Not Indexed Yet?
- New sites take 3-7 days
- Use URL Inspector → Request Indexing
- Check Coverage report for errors
- Ensure no robots.txt blocking

### No Data Showing?
- GSC needs 2-3 days to collect data
- Check date range (last 7 days)
- Verify property is correct URL

## Next Steps After Setup

1. **Wait 3-5 days** for initial data
2. **Check weekly** for the first month
3. **Submit new content** via URL Inspector
4. **Monitor search queries** that bring traffic
5. **Fix any errors** immediately

## Pro Tips

1. **Link GSC to Google Analytics** for complete data
2. **Set up Bing Webmaster Tools** too (10% of search traffic)
3. **Submit to Google News** if you write regular content
4. **Use Performance data** to guide content strategy

---

*Setup Time: 15-20 minutes*
*First Data: 3-5 days*
*Full Insights: 2-4 weeks*