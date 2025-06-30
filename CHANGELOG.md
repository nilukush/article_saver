# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-01-30

### 🚨 Critical Release - Pocket Import Before Shutdown
This is a critical release before Pocket shuts down on July 7, 2025. All users should update and import their Pocket articles immediately.

### Added
- Auto-update functionality for desktop application
- Progress tracking for Pocket imports with real-time updates
- Enhanced error handling and recovery for failed imports
- Cross-platform build support (Windows, macOS, Linux)
- Application icons for all platforms
- Generate ICO script for Windows icons
- Architecture detection for CI/CD builds
- Enterprise-grade security documentation (SECURITY.md)
- Comprehensive API documentation (API.md)
- Code of Conduct (CODE_OF_CONDUCT.md)
- Development setup guide (DEVELOPMENT.md)
- Automated development scripts for easy setup
- Enhanced security headers with CSP
- Health check endpoints for monitoring

### Fixed
- CI/CD pipeline issues preventing builds
- Windows icon format errors (replaced SVG with proper ICO)
- Linux .deb package metadata requirements
- macOS architecture mismatch on GitHub Actions
- TypeScript compiler path issues in CI
- Cross-platform build script compatibility
- npm workspaces incompatibility with electron-builder
- PATH environment variable conflicts in CI

### Changed
- Bumped version to 1.1.0 for critical pre-shutdown release
- Improved build process with direct electron-builder execution
- Enhanced CI/CD workflow with proper caching
- Updated package.json with author email and homepage
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
- All dependencies updated to latest secure versions

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

[Unreleased]: https://github.com/nilukush/article_saver/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/nilukush/article_saver/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nilukush/article_saver/releases/tag/v1.0.0