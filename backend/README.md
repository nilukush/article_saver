# Article Saver Backend API

Cloud backend API for Article Saver with user authentication and sync functionality.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Article Management**: Full CRUD operations for articles with user isolation
- **Cloud Sync**: Bidirectional sync between desktop app and cloud storage
- **Search & Filtering**: Advanced search with pagination and filtering options
- **Bulk Operations**: Batch operations for managing multiple articles
- **Security**: Rate limiting, CORS, input validation, and secure headers

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with security middleware
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: express-validator for input validation
- **Security**: Helmet, CORS, rate limiting

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Articles
- `GET /api/articles` - Get user's articles (with pagination, search, filters)
- `GET /api/articles/:id` - Get single article
- `POST /api/articles` - Create new article
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article
- `POST /api/articles/bulk` - Bulk operations (delete, mark read/unread, archive)

### Sync
- `POST /api/sync/upload` - Upload articles from desktop to cloud
- `GET /api/sync/download` - Download articles from cloud to desktop
- `GET /api/sync/status` - Get sync statistics
- `GET /api/sync/full` - Full sync download

### Health
- `GET /health` - Health check endpoint

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and JWT secret
   ```

3. **Set up database**:
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Or run migrations (for production)
   npm run db:migrate
   ```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/article_saver"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3003
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:5173"
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Database Schema

### Users
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `password` (String, Hashed)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Articles
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key)
- `url` (String)
- `title` (String, Optional)
- `content` (String, Optional)
- `excerpt` (String, Optional)
- `author` (String, Optional)
- `publishedDate` (DateTime, Optional)
- `tags` (String Array)
- `isRead` (Boolean)
- `isArchived` (Boolean)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for specific origins
- **Input Validation**: All inputs validated and sanitized
- **Security Headers**: Helmet.js for security headers
- **SQL Injection Prevention**: Prisma ORM with parameterized queries

## Sync Algorithm

The sync system uses timestamp-based conflict resolution:

1. **Upload Sync**: Desktop app sends local articles to cloud
   - New articles are created in cloud
   - Existing articles are compared by `updatedAt` timestamp
   - Local newer → Update cloud
   - Cloud newer → Record conflict for user resolution

2. **Download Sync**: Desktop app fetches updates from cloud
   - Can fetch all articles or only those updated since last sync
   - Desktop app handles merging with local data

3. **Conflict Resolution**: Last-write-wins with conflict reporting
   - Conflicts are reported to client for user decision
   - Manual resolution required for conflicting changes

## Error Handling

- Comprehensive error middleware with proper HTTP status codes
- Development vs production error responses
- Request logging for debugging
- Graceful shutdown handling

## Production Deployment

1. **Environment Setup**:
   - Set `NODE_ENV=production`
   - Use strong JWT secret
   - Configure production database
   - Set up proper CORS origins

2. **Database**:
   - Run migrations: `npm run db:migrate`
   - Set up database backups
   - Configure connection pooling

3. **Security**:
   - Use HTTPS in production
   - Set up proper firewall rules
   - Configure rate limiting for production load
   - Regular security updates

4. **Monitoring**:
   - Set up application monitoring
   - Configure log aggregation
   - Health check endpoints for load balancers

## API Usage Examples

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Create Article
```bash
curl -X POST http://localhost:3001/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"url": "https://example.com/article", "title": "Example Article"}'
```

### Get Articles
```bash
curl -X GET "http://localhost:3001/api/articles?page=1&limit=10&search=example" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include input validation
4. Write comprehensive tests
5. Update documentation

## License

MIT License - see LICENSE file for details.
