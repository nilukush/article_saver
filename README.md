# Article Saver

<div align="center">
  
  [![Website](https://img.shields.io/badge/Website-Live-brightgreen)](https://nilukush.github.io/article_saver/)
  [![GitHub Stars](https://img.shields.io/github/stars/nilukush/article_saver)](https://github.com/nilukush/article_saver/stargazers)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![GitHub release](https://img.shields.io/github/release/nilukush/article_saver.svg)](https://github.com/nilukush/article_saver/releases/)
  [![GitHub issues](https://img.shields.io/github/issues/nilukush/article_saver)](https://github.com/nilukush/article_saver/issues)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/nilukush/article_saver/pulls)
  
  **[🌐 Visit Our Website](https://nilukush.github.io/article_saver/) | [📥 Download](https://github.com/nilukush/article_saver/releases) | [📖 Documentation](https://github.com/nilukush/article_saver#-documentation)**

</div>

> 🚨 **Pocket is shutting down on July 8, 2025!** Don't lose your saved articles. Article Saver offers one-click import to save your entire library.

## 🎯 Quick Links

- **Website**: https://nilukush.github.io/article_saver/
- **Download**: [Latest Release](https://github.com/nilukush/article_saver/releases)
- **Import from Pocket**: [Migration Guide](https://nilukush.github.io/article_saver/blog/migrate-from-pocket)

<div align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express">
</div>

<div align="center">
  <h3>🚀 Enterprise-Grade Article Management System</h3>
  <p>Save, organize, and read articles with powerful cloud sync, OAuth authentication, and Pocket integration</p>
  <p>
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-downloads">Downloads</a> •
    <a href="API.md">API Docs</a> •
    <a href="DEVELOPMENT.md">Development</a> •
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</div>

---

## ✨ Features

### Core Features
- 📖 **Save & Read Articles** - Save articles from any URL with automatic content extraction
- 🔄 **Cloud Sync** - Real-time synchronization across all your devices
- 🏷️ **Smart Organization** - Tag, search, and filter your article collection
- 📱 **Offline Support** - Read your articles anywhere, anytime
- 🎨 **Beautiful Reader** - Distraction-free reading experience with customizable themes

### Enterprise Features
- 🔐 **OAuth Authentication** - Login with Google, GitHub, or email/password
- 🔗 **Account Linking** - Link multiple accounts and access all articles from one place
- 📥 **Pocket Import** - Import your entire Pocket library with one click
- 🔒 **Enterprise Security** - JWT authentication, rate limiting, and security headers
- 📊 **Bulk Operations** - Import, export, and manage thousands of articles efficiently

## 💻 System Requirements

### Desktop Application
- **Windows**: Windows 10 or later (64-bit)
- **macOS**: macOS 10.15 (Catalina) or later
  - Apple Silicon (M1/M2/M3) native support
  - Intel processors supported
- **Linux**: Ubuntu 20.04+, Fedora 36+, or equivalent
  - Requires libfuse2 for AppImage
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB for application + space for articles

### Backend Requirements
- **Node.js**: v18.0.0 or later
- **PostgreSQL**: v14.0 or later
- **Memory**: 512MB RAM minimum
- **Storage**: Depends on article count

## 📥 Downloads

Download the latest version (v1.1.3) for your platform:

### Windows
- [Article.Saver.Setup.1.1.3.exe](https://github.com/nilukush/article_saver/releases/download/v1.1.3/Article.Saver.Setup.1.1.3.exe) - Installer (Recommended)
- [Article.Saver.1.1.3.exe](https://github.com/nilukush/article_saver/releases/download/v1.1.3/Article.Saver.1.1.3.exe) - Portable

### macOS
- [Article.Saver-1.1.3-arm64.dmg](https://github.com/nilukush/article_saver/releases/download/v1.1.3/Article.Saver-1.1.3-arm64.dmg) - Apple Silicon (M1/M2/M3)
- [Article.Saver-1.1.3.dmg](https://github.com/nilukush/article_saver/releases/download/v1.1.3/Article.Saver-1.1.3.dmg) - Intel

**Note**: If macOS shows "damaged app", run: `xattr -cr /Applications/Article\ Saver.app`

### Linux
- [Article.Saver-1.1.3.AppImage](https://github.com/nilukush/article_saver/releases/download/v1.1.3/Article.Saver-1.1.3.AppImage) - AppImage (Universal)
- [article-saver-desktop_1.1.3_amd64.deb](https://github.com/nilukush/article_saver/releases/download/v1.1.3/article-saver-desktop_1.1.3_amd64.deb) - Debian/Ubuntu

[View all releases →](https://github.com/nilukush/article_saver/releases)

## 📸 Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="screenshots/article-list.png" alt="Article List" width="400"/>
        <br />
        <sub><b>Article List View</b></sub>
      </td>
      <td align="center">
        <img src="screenshots/article-view.png" alt="Article Reader" width="400"/>
        <br />
        <sub><b>Article Reader</b></sub>
      </td>
    </tr>
    <tr>
      <td align="center">
        <img src="screenshots/import-progress.png" alt="Pocket Import" width="400"/>
        <br />
        <sub><b>Pocket Import Progress</b></sub>
      </td>
      <td align="center">
        <img src="screenshots/add-articles.png" alt="Add Articles" width="400"/>
        <br />
        <sub><b>Add Articles</b></sub>
      </td>
    </tr>
  </table>
</div>

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Article Saver System                        │
├─────────────────────────┬───────────────────────────────────────────┤
│     Desktop Client      │           Backend API                      │
├─────────────────────────┼───────────────────────────────────────────┤
│ • Electron + React      │ • Express.js + TypeScript                 │
│ • Local JSON Database   │ • PostgreSQL Database                     │
│ • Offline-First         │ • Prisma ORM                              │
│ • Content Extraction    │ • JWT Authentication                      │
│ • Real-time Sync        │ • OAuth2 Integration                      │
└─────────────────────────┴───────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- PostgreSQL 14+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/nilukush/article_saver.git
cd article_saver

# Install dependencies
npm run install:all

# Start development servers
npm run dev
```

This will:
- ✅ Check all prerequisites
- ✅ Set up the database
- ✅ Start the backend API on http://localhost:3003
- ✅ Start the desktop app on http://localhost:19858

For detailed setup instructions, see [DEVELOPMENT.md](DEVELOPMENT.md).

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/article_saver"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# See backend/.env.example for all options
```

## 📚 Documentation

- [API Documentation](API.md) - Complete API reference
- [Development Guide](DEVELOPMENT.md) - Local development setup
- [Security Policy](SECURITY.md) - Security best practices
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Architecture](CLAUDE.md) - Technical architecture details

## 🔐 Security

Article Saver implements enterprise-grade security:

- **Authentication**: JWT tokens with secure refresh mechanism
- **Password Security**: bcrypt hashing with 12+ rounds
- **Rate Limiting**: 100 requests per 15 minutes
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Input Validation**: All inputs sanitized and validated
- **SQL Injection Prevention**: Prisma ORM with parameterized queries

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📊 Performance

- **Article Extraction**: < 2 seconds average
- **Search**: < 100ms for 10,000+ articles
- **Sync**: Real-time with conflict resolution
- **Import**: 1,000 articles/minute from Pocket

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + OAuth2 (Google, GitHub)
- **Logging**: Winston with rotation
- **Security**: Helmet.js, CORS, rate limiting

### Desktop
- **Framework**: Electron 28
- **UI**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Build**: Vite
- **Storage**: Local JSON database for offline support

## 📦 Deployment

### Backend Deployment
The backend can be deployed to any Node.js hosting platform:
- Heroku
- AWS Elastic Beanstalk
- Google Cloud Run
- DigitalOcean App Platform

### Desktop Distribution
Build installers for all platforms:
```bash
cd desktop
npm run dist
```

## 🐛 Troubleshooting

### Common Issues

**Port already in use**
```bash
npm run stop
npm run dev
```

**Database connection failed**
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string in .env
DATABASE_URL="postgresql://..."
```

**OAuth not working**
- Ensure redirect URLs match exactly
- Check client ID and secret are correct
- Verify OAuth app settings

See [DEVELOPMENT.md](DEVELOPMENT.md) for more troubleshooting tips.

## 📖 Documentation

- **[Installation Guide](INSTALLATION.md)** - Detailed installation instructions
- **[Development Setup](DEVELOPMENT.md)** - Set up your development environment
- **[API Reference](API.md)** - Backend API documentation
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Security Policy](SECURITY.md)** - Report security vulnerabilities
- **[Changelog](CHANGELOG.md)** - Version history and release notes

### Quick Links
- [Report a Bug](https://github.com/nilukush/article_saver/issues/new?labels=bug)
- [Request a Feature](https://github.com/nilukush/article_saver/issues/new?labels=enhancement)
- [Join Discussions](https://github.com/nilukush/article_saver/discussions)

## 🔧 Troubleshooting

### Common Issues

**macOS "damaged app" error**
```bash
xattr -cr /Applications/Article\ Saver.app
```

**Linux AppImage not running**
```bash
# Install required dependency
sudo apt install libfuse2  # Ubuntu/Debian
sudo dnf install fuse      # Fedora

# Make AppImage executable
chmod +x Article.Saver-*.AppImage
```

**Windows Defender blocking installation**
- Click "More info" → "Run anyway"
- Or add exception in Windows Security settings

**Cannot connect to backend**
- Check if backend is running: `curl http://localhost:3003/health`
- Verify environment variables are set correctly
- Check firewall settings

For more help, see our [Troubleshooting Guide](https://github.com/nilukush/article_saver/wiki/Troubleshooting).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Mozilla Readability](https://github.com/mozilla/readability) for content extraction
- [Pocket](https://getpocket.com) for API integration
- All our [contributors](https://github.com/nilukush/article_saver/graphs/contributors)

---

<div align="center">
  <p>Built with ❤️ by the Article Saver Team</p>
  <p>
    <a href="https://github.com/nilukush/article_saver/issues">Report Bug</a> •
    <a href="https://github.com/nilukush/article_saver/issues">Request Feature</a>
  </p>
</div>