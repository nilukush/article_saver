# Deployment Guide

## Overview

Article Saver consists of three main components:
1. Desktop application (Electron)
2. Backend API (Node.js/Express)
3. Analytics dashboard (Node.js/Express)

## Backend Deployment

The backend can be deployed to any platform that supports Node.js applications.

### Environment Variables Required

```bash
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_oauth_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
GITHUB_CLIENT_ID=your_github_oauth_id
GITHUB_CLIENT_SECRET=your_github_oauth_secret
NODE_ENV=production
```

### Deployment Steps

1. Build the application:
   ```bash
   cd backend
   npm install
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

## Desktop Application

### Development

```bash
cd desktop
npm install
npm run dev
```

### Building

```bash
npm run build
npm run dist
```

## Analytics Dashboard

See [analytics/README.md](analytics/README.md) for setup instructions.

## Security Notes

- Always use environment variables for sensitive configuration
- Never commit `.env` files
- Rotate OAuth secrets regularly
- Use HTTPS in production
