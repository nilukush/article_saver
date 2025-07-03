# Deploy to Your Existing article_saver Repository

## Great News! 
You already have the `article_saver` repository, so deployment is even easier!

**Your landing page URL will be**: `https://nilukush.github.io/article_saver/`

## Quick Deployment Steps (3 Minutes)

### Option 1: Direct GitHub Upload (Easiest)
1. Go to https://github.com/nilukush/article_saver
2. Click "Add file" → "Upload files"
3. Drag the `index.html` file
4. Commit message: "Add landing page"
5. Click "Commit changes"

### Option 2: Command Line
```bash
# You're already in the article_saver directory!
# Just copy the index.html to the root

# If you're in backend directory, go to root first
cd ..  # or cd /Users/nileshkumar/gh/article_saver

# The index.html is already created, just commit it
git add index.html
git commit -m "Add landing page for GitHub Pages"
git push origin main
```

## Enable GitHub Pages

1. Go to: https://github.com/nilukush/article_saver/settings/pages
2. Under "Source", select:
   - **Source**: Deploy from a branch
   - **Branch**: main
   - **Folder**: / (root)
3. Click **Save**

## Important: Your Repository Structure

Your repo structure will look like this:
```
article_saver/
├── index.html          # ← Your new landing page (for GitHub Pages)
├── backend/            # Your existing backend code
├── desktop/            # Your existing desktop app
├── shared/             # Your existing shared code
├── README.md          # Your existing README
└── other files...
```

**This is perfectly fine!** GitHub Pages will:
- Serve `index.html` at https://nilukush.github.io/article_saver/
- Ignore all the other directories
- Not interfere with your application code

## Verify Deployment

After enabling GitHub Pages:
1. Wait 2-10 minutes for initial deployment
2. Check: https://github.com/nilukush/article_saver/deployments
3. Visit: https://nilukush.github.io/article_saver/

## Update the index.html Links

Since your repo uses underscore, update these links in index.html:

```html
<!-- Change from -->
<a href="https://github.com/nilukush/article-saver">GitHub</a>

<!-- Change to -->
<a href="https://github.com/nilukush/article_saver">GitHub</a>
```

I need to update all GitHub links in the index.html:

### Find and Replace:
- `nilukush/article-saver` → `nilukush/article_saver`
- `article-saver/` → `article_saver/`

## Quick Command to Update Links

```bash
# Update all links in index.html
sed -i '' 's/article-saver/article_saver/g' index.html

# Or manually update these URLs:
# - https://github.com/nilukush/article_saver
# - https://github.com/nilukush/article_saver/releases
# - https://github.com/nilukush/article_saver/issues
# - https://github.com/nilukush/article_saver/blob/main/README.md
# - https://nilukush.github.io/article_saver/
```

## Pro Tips

### 1. Keep Your Code Separate
The landing page (index.html) in root won't interfere with your app code in subdirectories.

### 2. Update Your Main README
Add a link to your landing page at the top of README.md:
```markdown
# Article Saver

🌐 **[Visit our website](https://nilukush.github.io/article_saver/)**

[Rest of your README...]
```

### 3. Use gh-pages Branch (Optional)
If you prefer to keep landing page separate from code:
```bash
# Create orphan branch for GitHub Pages
git checkout --orphan gh-pages
git rm -rf .
# Add only index.html
git add index.html
git commit -m "GitHub Pages"
git push origin gh-pages

# Then select gh-pages branch in GitHub Pages settings
```

## Troubleshooting

**If page doesn't appear:**
1. Check https://github.com/nilukush/article_saver/settings/pages
2. Make sure it shows "Your site is published at..."
3. Check for any build errors

**If you see README instead of index.html:**
1. Make sure index.html is in the root directory
2. Clear browser cache
3. Try incognito/private window

## Next Steps

1. ✅ Commit index.html to your repo
2. ✅ Enable GitHub Pages
3. ✅ Share URL: https://nilukush.github.io/article_saver/
4. ⬜ Add Google Analytics (optional)
5. ⬜ Update with real screenshots

---

**Remember**: Your landing page URL will be:
## 🔗 https://nilukush.github.io/article_saver/

With underscore, not hyphen!