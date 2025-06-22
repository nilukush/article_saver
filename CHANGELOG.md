# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enterprise-grade security documentation (SECURITY.md)
- Comprehensive API documentation (API.md)
- Code of Conduct (CODE_OF_CONDUCT.md)
- Development setup guide (DEVELOPMENT.md)
- Automated development scripts for easy setup
- Enhanced security headers with CSP
- Health check endpoints for monitoring

### Changed
- Improved README with better structure and badges
- Updated package.json with proper repository metadata
- Enhanced Helmet.js configuration for better security
- Refactored global state management in Settings component

### Removed
- Debug routes from production build
- Test email endpoints from production
- Unnecessary global state anti-patterns
- Console.log statements (replaced with proper logging)

### Security
- Removed exposed secrets from repository
- Added .gitignore for backend to prevent secret exposure
- Implemented proper environment variable handling
- Enhanced CORS configuration

## [1.0.0] - 2024-06-22

### Added
- Initial release of Article Saver
- Desktop application with Electron + React
- Backend API with Express.js + PostgreSQL
- OAuth authentication (Google, GitHub)
- Pocket integration for article import
- Multi-account linking system
- Email verification for account security
- Offline-first architecture
- Real-time sync across devices
- Bulk article operations
- Advanced search and filtering
- Tag management system
- Read/Archive status tracking
- Content extraction with Mozilla Readability
- Rate limiting for API protection
- Winston logging with file rotation
- Comprehensive error handling

### Technical Stack
- Frontend: Electron 28, React 18, TypeScript, Tailwind CSS
- Backend: Express.js, PostgreSQL, Prisma ORM
- Authentication: JWT, OAuth2, bcrypt
- Development: Vite, ESLint, Prettier

[Unreleased]: https://github.com/nilukush/article_saver/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/nilukush/article_saver/releases/tag/v1.0.0