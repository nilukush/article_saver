# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# Logging and debugging
npm run logs            # Tail combined.log
npm run logs:error      # Tail error.log
npm run logs:watch      # Watch all log files
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
- Never use `(req as any).prisma` pattern - causes runtime errors

**Authentication Flow:**
- JWT tokens with 7-day expiration
- Support for email/password, Google OAuth, GitHub OAuth, and WebAuthn passkeys
- Rate limiting: 100 requests per 15 minutes globally

**Content Extraction:**
- Primary: Mozilla Readability (Firefox Reader View quality)
- Fallback: JSDOM with minimal configuration to avoid CSS parsing errors
- JSDOM config: Use URL-only, avoid `resources: "usable"` which causes CSS errors

**Error Handling:**
- Winston logging with file rotation (combined.log, error.log, debug.log)
- Comprehensive try-catch blocks with proper error propagation
- Progress endpoints excluded from rate limiting for real-time updates

## Directory Structure & Responsibilities

### `/backend/src/`
- `routes/articles.ts` - Article CRUD with pagination and search
- `routes/auth.ts` - Authentication (register, login, OAuth flows)
- `routes/pocket.ts` - Pocket API integration and import processing
- `routes/sync.ts` - Device synchronization endpoints
- `routes/passkey.ts` - WebAuthn passkey authentication
- `middleware/auth.ts` - JWT token verification middleware
- `utils/logger.ts` - Winston logging configuration

### `/desktop/src/`
- `main/main.ts` - Electron main process entry point with security config
- `main/preload.ts` - Secure IPC bridge between main and renderer
- `main/database/database.ts` - Local JSON file database operations
- `main/services/articleService.ts` - Content extraction and processing
- `renderer/stores/` - Zustand state management (articleStore, importStore)
- `renderer/components/` - React components with TypeScript
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
// Required security settings
contextIsolation: true,
nodeIntegration: false,
sandbox: false, // Required for preload scripts
devTools: false // Completely disabled in production
```

### IPC Communication
- All main/renderer communication through secure preload scripts
- Context isolation prevents direct Node.js access from renderer
- Type-safe IPC handlers with proper error boundaries

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
- Error tracking with structured Winston logging
- Debug mode available with detailed request/response logging

### Performance Optimizations
- Content extraction uses minimal JSDOM configuration
- Database queries use proper indexing and pagination
- Infinite scroll prevents loading all articles at once
- Local caching for frequently accessed data

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