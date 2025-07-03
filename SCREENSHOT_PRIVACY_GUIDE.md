# Screenshot Privacy Guide - Remove Personal Information

## 🚨 Privacy Issue Identified

Your screenshots contain personal information:
- **Email**: `nilukush@gmail.com` (in account-and-sync.png)
- **Username**: `(nilukush)` (in pocket-options.png)
- **Sidebar**: Shows email at bottom of screenshots

## Why This Matters

1. **Privacy Risk**: Exposes your email to spam and phishing
2. **Professional Image**: Demo screenshots should use generic data
3. **Security**: Links your GitHub profile to email address

## Quick Fix Solutions

### Option 1: Simple Rectangle Cover (2 minutes)

**Mac Preview**:
1. Open screenshot in Preview
2. Tools → Annotate → Rectangle
3. Draw rectangle over email/username
4. Fill with matching background color

**Windows Paint**:
1. Open in Paint
2. Select Rectangle tool
3. Draw filled rectangle over sensitive info

### Option 2: Professional Blur (5 minutes)

**Free Online Tool**: https://redact.photo/
1. Upload screenshot
2. Select blur tool
3. Click and drag over sensitive areas
4. Download edited version

### Option 3: Replace with Demo Text (10 minutes)

**Photopea** (Free Photoshop online):
1. Go to https://www.photopea.com/
2. Open screenshot
3. Use text tool to cover with:
   - Email: `demo@example.com`
   - Username: `(demo_user)`
   - Or: `user@articlesaver.com`

### Option 4: Quick CSS Fix for Future Screenshots

Add this CSS to hide personal info in screenshots:
```css
/* Add to your app's screenshot mode */
.screenshot-mode [data-email],
.screenshot-mode .user-email {
    position: relative;
}

.screenshot-mode [data-email]::after,
.screenshot-mode .user-email::after {
    content: 'demo@example.com';
    position: absolute;
    background: inherit;
    left: 0;
    right: 0;
}
```

## Recommended Approach

1. **Immediate**: Use rectangle cover (Option 1)
2. **Professional**: Use Photopea to replace text (Option 3)
3. **Future**: Create demo account for screenshots

## Files to Edit:

1. **account-and-sync.png**
   - Hide: `nilukush@gmail.com`
   - Replace with: `demo@example.com`

2. **pocket-options.png**
   - Hide: `(nilukush)`
   - Replace with: `(demo_user)`

3. **Check all screenshots** for email in sidebar

## After Editing:

1. Save with same filenames
2. Commit and push:
```bash
git add screenshots/account-and-sync.png screenshots/pocket-options.png
git commit -m "Remove personal information from screenshots"
git push origin main
```

## Best Practices for Future:

1. **Create demo account** with generic email
2. **Use browser extension** to auto-replace personal info
3. **Review screenshots** before publishing
4. **Use placeholder data** in development

Your privacy is important - fix this before the site gets more traffic!