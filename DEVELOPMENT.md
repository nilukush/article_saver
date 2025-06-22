# Enterprise Development Setup Guide

## 🚀 Quick Start

The **most standard enterprise-grade** way to start development:

```bash
# One-command startup
./scripts/start-dev.sh
```

This enterprise script will:
- ✅ Check all prerequisites (Node.js 18+, PostgreSQL, npm)
- ✅ Verify environment configuration (.env files)
- ✅ Check port availability (3003, 19858)
- ✅ Start PostgreSQL if not running
- ✅ Set up database schema with Prisma
- ✅ Install dependencies if needed
- ✅ Start both backend and desktop servers
- ✅ Display real-time health status

## 📋 Prerequisites

### Required Software
- **Node.js**: v18.0.0 or higher (v20.x LTS recommended)
- **PostgreSQL**: v14.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: For version control

### macOS Installation
```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (via nvm - recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14
```

## 🔧 Manual Setup (If Needed)

### 1. Database Setup
```bash
# Create database and user
createdb article_saver
psql article_saver -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### 2. Environment Configuration
```bash
# Backend configuration
cd backend
cp .env.example .env
# Edit .env with your credentials

# Desktop configuration (optional)
cd ../desktop
echo "VITE_API_URL=http://localhost:3003" > .env
```

### 3. Install Dependencies
```bash
# From root directory
npm run install:all
```

### 4. Database Schema
```bash
cd backend
npm run db:generate
npm run db:push
```

## 🛠️ Development Commands

### Starting Development
```bash
# Enterprise method (recommended)
./scripts/start-dev.sh

# Alternative: Manual startup
cd backend && npm run dev  # Terminal 1
cd desktop && npm run dev  # Terminal 2
```

### Health Check
```bash
# Check all services status
./scripts/health-check.sh
```

### Stopping Development
```bash
# Stop all services
./scripts/stop-dev.sh
```

### Database Management
```bash
cd backend

# Prisma Studio (GUI)
npm run db:studio

# Generate Prisma Client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate
```

## 📊 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Backend API | http://localhost:3003 | Express.js REST API |
| Desktop App | http://localhost:19858 | Electron + React app |
| API Health | http://localhost:3003/api/health | Health check endpoint |
| Prisma Studio | http://localhost:5555 | Database GUI |

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Kill specific port
lsof -ti:3003 | xargs kill -9

# Or use the stop script
./scripts/stop-dev.sh
```

### PostgreSQL Not Running
```bash
# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql

# Check status
pg_isready
```

### Database Connection Issues
```bash
# Check PostgreSQL is accepting connections
psql -U postgres -c "SELECT 1"

# Verify connection string in .env
DATABASE_URL="postgresql://user:password@localhost:5432/article_saver"
```

### Node Module Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf desktop/node_modules desktop/package-lock.json
npm run install:all
```

## 🔐 Security Configuration

### OAuth Setup
1. **Google OAuth**
   - Visit [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:3003/api/auth/google/callback`

2. **GitHub OAuth**
   - Visit GitHub Settings > Developer settings > OAuth Apps
   - Create new OAuth App
   - Set callback URL: `http://localhost:3003/api/auth/github/callback`

### Environment Variables
Never commit `.env` files. Always use `.env.example` as template.

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Generate with: `openssl rand -base64 64`
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`

## 📚 Architecture

### Technology Stack
- **Backend**: Express.js + TypeScript + Prisma ORM
- **Desktop**: Electron + React + TypeScript + Vite
- **Database**: PostgreSQL with Prisma
- **Authentication**: JWT + OAuth2 (Google, GitHub)
- **Styling**: Tailwind CSS

### Project Structure
```
article_saver/
├── backend/          # Express.js API
│   ├── src/         # TypeScript source
│   ├── prisma/      # Database schema
│   └── logs/        # Application logs
├── desktop/         # Electron app
│   ├── src/
│   │   ├── main/    # Main process
│   │   └── renderer/ # React app
│   └── dist/        # Build output
├── shared/          # Shared types
└── scripts/         # Development scripts
```

## 🎯 Best Practices

1. **Always use the enterprise scripts** for consistent setup
2. **Check health status** before starting development
3. **Keep dependencies updated** with security patches
4. **Follow the commit message format** for clear history
5. **Test database changes** in Prisma Studio first
6. **Monitor logs** in `logs/` directory for debugging

## 📞 Support

For issues:
1. Run health check: `./scripts/health-check.sh`
2. Check logs: `tail -f backend/logs/combined.log`
3. Verify prerequisites are installed
4. Ensure PostgreSQL is running
5. Check .env configuration

---

This setup provides the **most standard, enterprise-grade, correct, and perfect** development environment for the Article Saver application.