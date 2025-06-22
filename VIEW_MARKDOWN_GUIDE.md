# 📖 Markdown Viewing Guide for Article Saver Documentation

## 🚀 Quick Start (In Cursor)

1. **Open any .md file**
2. **Press** `Shift+Cmd+V` (Mac) or `Ctrl+Shift+V` (Windows/Linux)
3. **Done!** You're now viewing in preview mode

## 🎯 Viewing Options Ranked by User-Friendliness

### 1. **Cursor Built-in Preview** ⭐⭐⭐⭐⭐
**Best for**: Reading while coding
```
Shortcuts:
- Preview: Shift+Cmd+V (Mac) / Ctrl+Shift+V (Win/Linux)
- Side-by-side: Cmd+K V (Mac) / Ctrl+K V (Win/Linux)
```

### 2. **GitHub Web View** ⭐⭐⭐⭐⭐
**Best for**: Beautiful rendering, easy sharing
```bash
./scripts/view-docs-browser.sh
```
- Professional GitHub styling
- Automatic table of contents
- Perfect formatting

### 3. **Markdown Preview Enhanced Extension** ⭐⭐⭐⭐
**Best for**: Advanced features
- Install in Cursor: Search "Markdown Preview Enhanced"
- Features: PDF export, diagrams, math equations

### 4. **MacDown (Mac Only)** ⭐⭐⭐⭐
**Best for**: Dedicated markdown editing
```bash
brew install --cask macdown
open -a MacDown DEPLOYMENT.md
```

### 5. **Typora** ⭐⭐⭐⭐
**Best for**: WYSIWYG editing
- Download from typora.io
- Live preview as you type
- Clean, distraction-free

### 6. **Obsidian** ⭐⭐⭐
**Best for**: Note-taking and documentation
- Free for personal use
- Graph view for linked documents
- Extensive plugin ecosystem

## 📱 Platform-Specific Recommendations

### macOS
1. **Cursor** (already using)
2. **MacDown** (free, native)
3. **Marked 2** ($13.99, professional)

### Windows
1. **Cursor** (already using)
2. **Markdown Monster** (free trial)
3. **Typora** (one-time purchase)

### Linux
1. **Cursor** (already using)
2. **ReText** (free, open source)
3. **Ghostwriter** (free, distraction-free)

## 🎨 Quick Styling Tips

### For Better Readability in Cursor:
1. **Install Theme**: "GitHub Theme" or "One Dark Pro"
2. **Adjust Font Size**: Cmd+= (Mac) or Ctrl+= (Win/Linux)
3. **Zen Mode**: Cmd+K Z for distraction-free reading

### Custom CSS for Markdown Preview:
1. Open settings: Cmd+, (Mac) or Ctrl+, (Win/Linux)
2. Search "markdown.styles"
3. Add custom CSS file path

## 🚨 Troubleshooting

### Preview Not Working?
1. Ensure file has `.md` extension
2. Try closing and reopening the file
3. Restart Cursor

### Want Different Styling?
1. Install "Markdown Preview Github Styling" extension
2. Or use "Markdown PDF" for print-friendly view

## 💡 Pro Tips

1. **Split View**: Drag tab to side for dual-pane view
2. **Outline View**: Cmd+Shift+O shows document structure
3. **Search**: Cmd+F works in preview mode
4. **Export**: Use Markdown Preview Enhanced for PDF/HTML export

## 🎯 Recommended Workflow

1. **For Quick Reading**: Use Cursor's built-in preview
2. **For Detailed Study**: Open in GitHub (browser)
3. **For Printing**: Use Markdown Preview Enhanced → Export PDF
4. **For Sharing**: Send GitHub links

---

## Quick Commands Summary

```bash
# Open in Cursor with preview hints
./scripts/open-deployment-docs.sh

# View in browser (GitHub rendering)
./scripts/view-docs-browser.sh

# Direct Cursor commands
cursor DEPLOYMENT.md
cursor DEPLOYMENT_CHECKLIST.md
```

Remember: The built-in Cursor preview (Shift+Cmd+V) is usually all you need!