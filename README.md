# Article Saver

<div align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express">
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="MIT License">
</div>

<div align="center">
  <h3>🚀 Enterprise-Grade Article Management System</h3>
  <p>Save, organize, and read articles with powerful cloud sync, OAuth authentication, and Pocket integration</p>
  <p>
    <a href="#quick-start">Quick Start</a> •
    <a href="API.md">API Docs</a> •
    <a href="DEVELOPMENT.md">Development</a> •
    <a href="CONTRIBUTING.md">Contributing</a> •
    <a href="SECURITY.md">Security</a>
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

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Article Saver System                        │
├─────────────────────────┬───────────────────────────────────────────┤
│     Desktop Client      │           Backend API                      │
├─────────────────────────┼───────────────────────────────────────────┤
│ • Electron + React      │ • Express.js + TypeScript                 │
│ • Local SQLite Storage  │ • PostgreSQL Database                     │
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
- **Storage**: Local SQLite for offline support

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