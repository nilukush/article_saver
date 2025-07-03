# Social Media Image Creation Guide

## Overview
You need an Open Graph (OG) image for social media sharing. This image appears when someone shares your link on Twitter, Facebook, LinkedIn, etc.

## Specifications
- **Size**: 1200 x 630 pixels (optimal for all platforms)
- **Format**: PNG or JPG
- **File name**: `og-image.png`
- **Location**: `/screenshots/og-image.png`

## Option 1: Canva (Free & Easy) - RECOMMENDED

### Step-by-Step:
1. Go to https://www.canva.com
2. Sign up/Login (free account)
3. Search for "Facebook Ad" template (it's 1200x630px)
4. Choose a template or start blank

### Design Elements:
```
Layout Structure:
┌─────────────────────────────────────────┐
│                                         │
│     📚 Article Saver                    │
│                                         │
│  Save Your Pocket Articles              │
│  Before July 8, 2025                    │
│                                         │
│  [Screenshot of App]                    │
│                                         │
│  ✓ One-Click Import                     │
│  ✓ 100% Free & Open Source             │
│  ✓ Privacy-First                        │
│                                         │
│  Download Now →                         │
└─────────────────────────────────────────┘
```

### Canva Design Steps:
1. **Background**: Use gradient (blue to light blue)
2. **Title**: "Article Saver" - Bold, 72px
3. **Urgency**: "Save Your Pocket Articles Before July 8, 2025" - 48px
4. **Screenshot**: Add your article-list.png (resize to fit)
5. **Features**: Add checkmarks with benefits
6. **CTA**: "Download Now →" button visual

### Download:
- Click "Share" → "Download"
- Choose PNG
- Save as `og-image.png`

## Option 2: Figma (Free)

1. Go to https://www.figma.com
2. Create new design (1200 x 630)
3. Use similar layout as above
4. Export as PNG

## Option 3: Quick HTML/CSS Solution

Create `og-image-generator.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            width: 1200px;
            height: 630px;
            font-family: -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 60px;
            box-sizing: border-box;
        }
        
        h1 {
            font-size: 80px;
            margin: 0 0 20px 0;
            font-weight: 800;
        }
        
        .subtitle {
            font-size: 36px;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        
        .warning {
            background: rgba(255, 255, 255, 0.2);
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 28px;
            margin-bottom: 30px;
        }
        
        .features {
            display: flex;
            gap: 40px;
            font-size: 24px;
            margin-top: 40px;
        }
        
        .feature {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .logo {
            font-size: 100px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="logo">📚</div>
    <h1>Article Saver</h1>
    <div class="subtitle">Open Source Read-Later App</div>
    <div class="warning">
        ⚠️ Pocket shuts down July 8, 2025
    </div>
    <div class="features">
        <div class="feature">✓ One-Click Import</div>
        <div class="feature">✓ 100% Free</div>
        <div class="feature">✓ Privacy-First</div>
    </div>
</body>
</html>
```

Then:
1. Open in browser
2. Take screenshot (Cmd+Shift+4 on Mac)
3. Or use browser DevTools to capture

## Option 4: Use Existing Screenshot

Quick solution - use your best screenshot:
```bash
# Copy your article list screenshot as OG image
cp screenshots/article-list.png screenshots/og-image.png
```

This works but custom image is better for social sharing.

## After Creating OG Image:

1. Save as `screenshots/og-image.png`
2. Update index.html meta tags:
```html
<meta property="og:image" content="https://nilukush.github.io/article_saver/screenshots/og-image.png">
<meta property="twitter:image" content="https://nilukush.github.io/article_saver/screenshots/og-image.png">
```

3. Test with:
   - https://www.opengraph.xyz
   - https://cards-dev.twitter.com/validator
   - https://developers.facebook.com/tools/debug/

## Pro Tips:

1. **Text Contrast**: Ensure text is readable
2. **Mobile Preview**: Most shares viewed on mobile
3. **File Size**: Keep under 1MB for fast loading
4. **Branding**: Use consistent colors/fonts
5. **Call to Action**: Make benefit clear

## Emergency Quick Fix:

If you need something NOW:
```bash
# Use article-list screenshot as temporary OG image
cp screenshots/article-list.png screenshots/og-image.png
```

Then update meta tags in index.html as shown above.

## Recommended Text for OG Image:

**Main Title**: Article Saver
**Subtitle**: Save Your Pocket Articles Before July 8, 2025
**Features**: 
- ✓ Import 10,000+ articles in minutes
- ✓ Free & Open Source
- ✓ Your data, your control

**CTA**: Download Now - 100% Free

This creates urgency and clearly communicates the value proposition!