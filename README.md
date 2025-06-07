# Article Saver

A beautiful, cross-platform desktop application for saving and reading articles offline. Built with Electron, React, and TypeScript.

![Article Saver Screenshot](https://via.placeholder.com/800x500/1a1a1a/ffffff?text=Article+Saver+Screenshot)

## ✨ Features

- **Save Articles**: Extract and save articles from any URL with automatic content parsing
- **Offline Reading**: Read your saved articles without an internet connection
- **Full-Text Search**: Search across all your articles by title, content, author, or tags
- **Tag Management**: Organize articles with flexible tagging system
- **Read Status**: Track read/unread status and archive articles
- **Dark Theme**: Beautiful, modern dark interface designed for comfortable reading
- **Cross-Platform**: Works on macOS (Intel & Apple Silicon), Windows, and Linux
- **No Dependencies**: Uses file-based storage - no database setup required

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/article-saver.git
cd article-saver
```

2. Install dependencies:
```bash
cd desktop
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will open automatically in a new Electron window.

## 🏗️ Building for Production

### Development Build
```bash
cd desktop
npm run build
```

### Create Distributable Package
```bash
cd desktop
npm run dist
```

This will create platform-specific installers in the `desktop/release` directory.

## 🛠️ Development

### Project Structure

```
article-saver/
├── desktop/                 # Electron application
│   ├── src/
│   │   ├── main/           # Electron main process
│   │   │   ├── database/   # File-based database
│   │   │   ├── services/   # Article extraction services
│   │   │   ├── main.ts     # Main process entry
│   │   │   └── preload.ts  # Preload script
│   │   └── renderer/       # React frontend
│   │       ├── components/ # React components
│   │       ├── stores/     # Zustand state management
│   │       └── App.tsx     # Main React app
│   ├── package.json
│   └── vite.config.ts
├── shared/                 # Shared TypeScript types
└── README.md
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Desktop Framework**: Electron 28
- **Build Tool**: Vite
- **Content Extraction**: JSDOM
- **Database**: File-based JSON storage

### Available Scripts

In the `desktop` directory:

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm run dist` - Create distributable packages
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🎯 How It Works

1. **Article Saving**: Paste any article URL, and the app automatically extracts the content, title, author, and metadata
2. **Content Storage**: Articles are stored locally in JSON format with full-text search capabilities
3. **Reading Experience**: Clean, distraction-free reading interface with table of contents for long articles
4. **Organization**: Tag articles and use the search function to quickly find what you're looking for

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Reporting Issues

Please use the [GitHub Issues](https://github.com/yourusername/article-saver/issues) page to report bugs or request features.

## 📝 Architecture Notes

### Why File-Based Storage?

Article Saver uses a simple JSON file-based database instead of SQLite to avoid native module compilation issues across different architectures (Intel vs Apple Silicon). This approach provides:

- **Zero Setup**: No database installation required
- **Cross-Platform**: Works on all architectures without compilation
- **Portable**: Easy to backup and sync your data
- **Reliable**: No native module dependency conflicts

### Content Extraction

The app uses JSDOM to parse article content from web pages, extracting:
- Article title and author
- Main content (cleaned of ads and navigation)
- Publication date
- Meta descriptions

## 🔧 Troubleshooting

### Common Issues

**App won't start on macOS**
- Make sure you have the latest version of Node.js installed
- Try running `npm run build:electron` before `npm run dev`

**Articles not saving**
- Check that the app has write permissions to your user data directory
- Look for error messages in the developer console (View → Toggle Developer Tools)

**Search not working**
- The search function looks through article titles, content, URLs, and tags
- Try using different keywords or check if articles were saved properly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- UI components inspired by modern design systems
- Content extraction powered by [JSDOM](https://github.com/jsdom/jsdom)

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/article-saver/issues) page
2. Create a new issue with detailed information about your problem
3. Include your operating system and Node.js version

---

**Made with ❤️ for the open source community**
