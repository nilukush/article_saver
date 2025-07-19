# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monetization Status

### Current Situation (Jan 2025)
- **Traffic**: ~3,000-6,000 monthly pageviews (not eligible for EthicalAds which requires 50k+)
- **Railway Costs**: $5/month (transitioned from free tier)
- **Founder**: Solo founder (Nilesh Kumar), also CEO/CTO of Zenith (unfunded startup)

### Active Monetization
1. **Ko-fi**: Set up at https://ko-fi.com/nilukush
   - Username: nilukush
   - No company required for individual creators
   - 0% platform fee (only payment processing ~3%)
   - Accepts one-time and monthly support
   - PayPal and Stripe payouts available
   
2. **Support Page**: Created at `/support.html` showing infrastructure costs
3. **GitHub Sponsors**: Added FUNDING.yml file for GitHub sponsor button

### Future Options When Traffic Grows
- **EthicalAds**: Integration code ready but disabled (requires 50k+ pageviews)
- **Open Collective**: Provides financial transparency for open source projects (10% + payment fees)
- **GitHub Sponsors**: Requires business entity for Stripe

## Development Commands

### Root Level Commands
```bash
# Install all dependencies across workspaces
npm run install:all

# Start development servers
npm run dev:desktop      # Start Electron app in development mode
npm run dev:backend      # Start Express API server with nodemon

# Production builds
npm run build:desktop    # Build Electron app for production
npm run build:backend    # Compile TypeScript backend to JavaScript
```

### Backend Development (`cd backend/`)
```bash
# Core development
npm run dev              # Start with nodemon + TypeScript compilation
npm run build           # Compile TypeScript to dist/
npm run start           # Run compiled JavaScript

# Database operations (Prisma + PostgreSQL)
npm run db:generate     # Generate Prisma client after schema changes
npm run db:push         # Push schema changes to database
npm run db:migrate      # Run database migrations
npm run db:studio       # Open Prisma Studio GUI

```

### Desktop Development (`cd desktop/`)
```bash
# Development
npm run dev             # Start both Vite dev server and Electron
npm run dev:vite        # Start only Vite dev server (port 19858)
npm run dev:electron    # Start only Electron (requires Vite running)

# Building and packaging
npm run build           # Full build (TypeScript compilation + Vite build)
npm run build:vite      # Build renderer process only
npm run build:electron  # Build main process only
npm run dist            # Build and create distributable packages

# Code quality
npm run type-check      # TypeScript type checking
npm run lint            # ESLint code checking

# Maintenance
npm run clean           # Clean dist/ and cache
npm run clean:all       # Clean everything including node_modules
npm run dev:clean       # Clean and restart development
```

## Architecture Overview

### Hybrid Local-First + Cloud Architecture
- **Desktop app** with local JSON file database for offline-first experience
- **Backend API** with PostgreSQL for authentication and cloud sync
- **Electron main/renderer** process separation for security and performance

### Key Architectural Patterns

**Database Access:**
- Backend: Always import Prisma directly with `import { prisma } from '../database'`
- Desktop: Use file-based JSON storage via `database/database.ts` service
- Enterprise connection pooling with global Prisma instance management
- Never use `(req as any).prisma` pattern - causes runtime errors

**Authentication Flow:**
- JWT tokens with 7-day expiration and linkedUserIds support
- Support for email/password, Google OAuth, GitHub OAuth, and WebAuthn passkeys
- Multi-tenant linked accounts architecture for enterprise use
- Rate limiting: 100 requests per 15 minutes globally

**Content Extraction:**
- Primary: Mozilla Readability (Firefox Reader View quality)
- Fallback: JSDOM with minimal configuration to avoid CSS parsing errors
- JSDOM config: Use URL-only, avoid `resources: "usable"` which causes CSS errors

**Enterprise Logging & Error Handling:**
- Backend: Winston structured logging with JSON format and file rotation
- Desktop: Custom Electron logger with main/renderer process separation  
- Log levels: debug (development), info (business events), warn (production), error (critical)
- File locations: `~/Library/Application Support/Article Saver/logs/` (macOS)
- NEVER use console.log in production code - use proper logger methods
- Comprehensive try-catch blocks with proper error propagation
- Progress endpoints excluded from rate limiting for real-time updates
- Security-compliant logging (no sensitive data exposure)

## Directory Structure & Responsibilities

### `/backend/src/`
- `routes/articles.ts` - Article CRUD with pagination, search, and linked accounts support
- `routes/auth.ts` - Authentication (register, login, OAuth flows)
- `routes/pocket.ts` - Pocket API integration and import processing
- `routes/sync.ts` - Device synchronization endpoints
- `routes/accountLinking.ts` - Enterprise account linking and management
- `middleware/auth.ts` - JWT token verification with linked accounts support
- `utils/logger.ts` - Winston structured logging configuration
- `utils/enterpriseAccountLinking.ts` - Multi-tenant account management
- `database.ts` - Enterprise Prisma connection management

### `/desktop/src/`
- `main/main.ts` - Electron main process entry point with security config
- `main/preload.ts` - Secure IPC bridge between main and renderer
- `main/database/database.ts` - Local JSON file database operations
- `main/services/articleService.ts` - Content extraction and processing
- `main/utils/logger.ts` - Enterprise Electron main process logging
- `renderer/stores/` - Zustand state management (articleStore, importStore)
- `renderer/components/` - React components with TypeScript
- `renderer/utils/logger.ts` - Enterprise Electron renderer process logging
- `renderer/hooks/useInfiniteScroll.ts` - Infinite scroll implementation

### `/shared/types.ts`
- Common TypeScript interfaces for articles, users, API responses
- Ensures type safety across desktop and backend applications

## Database Schema & Patterns

### PostgreSQL (Backend)
```typescript
User {
  id: UUID
  email: String (unique)
  password: String (bcrypt hashed)
  articles: Article[]
  credentials: Credential[] // WebAuthn
}

Article {
  id: UUID
  userId: UUID
  url: String
  title?: String
  content?: String // HTML content
  excerpt?: String
  author?: String
  publishedDate?: DateTime
  tags: String[]
  isRead: Boolean
  isArchived: Boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Local JSON Database (Desktop)
- File location: `~/Library/Application Support/Article Saver/articles.json` (macOS)
- Atomic write operations with temporary files
- Automatic backup and recovery mechanisms

## Pocket Integration

### Import Process
- OAuth flow with request/access token exchange
- Rate limiting: 2-second delays between requests, exponential backoff
- Batch processing: 30 articles per request, up to 15,000 total
- Progress tracking with real-time polling every 3 seconds
- Success rate: ~97% (handles duplicate detection and API errors)

### Implementation Details
- Progress endpoint: `/api/pocket/progress` (excluded from rate limiting)
- Background processing with persistent progress state
- Comprehensive error handling for network failures and API limits

## Electron Security Configuration

### Main Process Security
```typescript
// Enterprise security settings
contextIsolation: true,
nodeIntegration: false,
sandbox: false, // Required for preload scripts
devTools: false // Completely disabled in production with enterprise controls
```

### Security Controls
- Developer tools completely blocked in production builds
- All debugging shortcuts disabled in production
- Context menu disabled for enterprise security
- Custom menu bar with proper application branding
- Security warnings disabled with proper enterprise configurations

### IPC Communication
- All main/renderer communication through secure preload scripts
- Context isolation prevents direct Node.js access from renderer
- Type-safe IPC handlers with proper error boundaries
- Secure net.fetch implementation for API calls

## State Management Patterns

### Zustand Stores
- `articleStore.ts` - Article management with infinite scroll pagination
- `importStore.ts` - Import progress and background processing state
- Pattern: Use `loadInitialArticles()` then `loadMoreArticles()` for pagination

### Infinite Scroll Implementation
- Threshold: 80% scroll position triggers next load
- Batch sizes: 100 initial, 50 per subsequent load
- Debounced scroll events (200ms) for performance
- Loading states with skeleton components

## Production Considerations

### Building and Packaging
- Backend: Compile TypeScript to `dist/` then run with `npm start`
- Desktop: Full build includes both Vite bundle and Electron compilation
- Distribution: Use `npm run dist` to create platform-specific installers

### Logging and Monitoring
- All logs written to `/backend/logs/` with rotation
- Enterprise structured logging with Winston (no console.log in production)
- Security-compliant logging (no sensitive data exposure)
- Debug mode available with detailed request/response logging

### Performance Optimizations
- Content extraction uses minimal JSDOM configuration
- Database queries use proper indexing and pagination
- Enterprise Prisma connection pooling and management
- Infinite scroll prevents loading all articles at once
- Local caching for frequently accessed data
- Optimized frontend logging (debug statements removed from production)

## Common Issues & Solutions

### JSDOM CSS Parsing Errors
- **Problem**: "Could not parse CSS stylesheet" errors
- **Solution**: Use minimal JSDOM config with URL only, avoid `resources: "usable"`

### Database Connection Issues
- **Problem**: `(req as any).prisma` undefined errors
- **Solution**: Always import Prisma directly: `import { prisma } from '../database'`

### Timestamp Display Issues
- **Problem**: "Last synced: Unknown" showing to users
- **Solution**: Multiple timestamp save points with fallback to "Recently imported"

### Import Progress Tracking
- **Problem**: Real-time progress not updating
- **Solution**: Progress endpoints excluded from rate limiting, 3-second polling interval

## Enterprise Security & Configuration

### Environment Variables
- **CRITICAL**: Never commit `.env` files to repository
- Use `.env.example` as template with placeholder values
- Rotate all OAuth secrets and JWT keys after any exposure
- Required variables: DATABASE_URL, JWT_SECRET, OAuth credentials

### OAuth Security
- Client secrets and JWT keys must be kept secure
- Redirect URIs must match exactly (no wildcards)
- OAuth tokens stored with encryption in database
- Account linking requires email verification for enterprise compliance

### Electron Security
- Context isolation enabled (`contextIsolation: true`)
- Node integration disabled in renderer (`nodeIntegration: false`)
- Content Security Policy enforced
- Dev tools completely disabled in production builds
- All IPC communication through secure preload scripts

### Database Security
- PostgreSQL with prepared statements (Prisma ORM)
- Password hashing with bcrypt (12 rounds minimum)
- Rate limiting: 100 requests per 15 minutes globally
- Input validation on all API endpoints
- No sensitive data in logs or error messages

## Public Repository Security Guidelines

### NEVER Commit to Public Repositories
- **Local file paths**: Especially those containing usernames (e.g., `/Users/username/...`)
- **Internal deployment guides**: Keep deployment instructions with system-specific paths local only
- **Personal/organizational information**: Directory structures, internal URLs, employee names
- **System configurations**: Development environment details, internal tooling configs
- **Sensitive documentation**: Any docs with non-public information
- **Debug/development versions**: Never deploy debug, test, or multiple versions to production
- **Console statements**: Remove all console.log/error from production code (security risk)

### SAFE to Commit to Public Repositories
- **Generic documentation**: README files, API docs, contributing guidelines
- **Public dashboards**: Analytics dashboards using only public APIs (like GitHub stats)
- **Example configurations**: Using placeholders and generic paths
- **Open source code**: Without embedded secrets or personal information

### Enterprise Dashboard Security Best Practices
1. **Single Production Version**: Only deploy ONE hardened version, never multiple variants
2. **No Debug Code**: Remove all debug features, console statements, and test endpoints
3. **Environment Separation**: Use environment variables, not separate code versions
4. **Security Headers**: Implement CSP, HSTS, and other security headers
5. **OWASP Compliance**: Follow OWASP guidelines (avoid CWE-489: Active Debug Code)
6. **Automated Security Checks**: Use CI/CD to verify no debug code reaches production

### Best Practices for Documentation
1. **Use .gitignore**: Add patterns for internal docs (e.g., `*_DEPLOYMENT_*.md`, `*_INTERNAL_*.md`)
2. **Review before committing**: Check for usernames, local paths, internal URLs
3. **Separate internal/external docs**: Keep internal guides in a separate, non-tracked directory
4. **Use environment variables**: Never hardcode paths or sensitive data
5. **Generic examples**: Replace real paths with placeholders in public docs

### Example .gitignore Patterns for Internal Docs
```
# Internal deployment and planning documents
DEPLOYMENT_*.md
*_DEPLOYMENT_*.md
*_INTERNAL_*.md
*_STRATEGY.md
*_ACTION_PLAN*.md
URGENT_*.md
CRITICAL_*.md
FIX_*.md

# Local configuration
.env*
!.env.example
*.local
```

### Security Incident Response
If sensitive information is accidentally committed:
1. **Remove from repository immediately**: Use `git rm --cached filename`
2. **Update .gitignore**: Add patterns to prevent future commits
3. **Clean git history if needed**: Use BFG Repo-Cleaner for sensitive data in history
4. **Rotate any exposed credentials**: Assume full exposure, rotate immediately
5. **Document the learning**: Update this file to prevent recurrence