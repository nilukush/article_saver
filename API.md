# Article Saver API Documentation

## API Version

Current Version: **v1**

The Article Saver API follows semantic versioning. While we're currently on v1, the API is stable and backwards compatible.

## OpenAPI Specification

Download the OpenAPI 3.0 specification:
- [JSON Format](https://github.com/nilukush/article_saver/blob/main/backend/openapi.json) (Coming soon)
- [YAML Format](https://github.com/nilukush/article_saver/blob/main/backend/openapi.yaml) (Coming soon)

You can use these with tools like:
- [Swagger UI](https://swagger.io/tools/swagger-ui/) for interactive documentation
- [Postman](https://www.postman.com/) for API testing
- [OpenAPI Generator](https://openapi-generator.tech/) for client SDK generation

## Base URL

### Development
```
http://localhost:3003/api
```

### Production
```
https://your-api-domain.com/api
```

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Rate Limiting

### Limits
- **Standard endpoints**: 100 requests per 15 minutes per IP
- **Progress endpoints**: Excluded from rate limiting
- **Import endpoints**: 10 requests per hour

### Headers
Rate limit information is included in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1704114000
```

### Rate Limit Response
When rate limit is exceeded:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 900
}
```
Status Code: `429 Too Many Requests`

## Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

### Authentication

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "token": "jwt.token.here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "provider": "local"
  }
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### OAuth Login
```
GET /api/auth/google
GET /api/auth/github
```
Redirects to OAuth provider for authentication.

#### OAuth Callbacks
```
GET /api/auth/google/callback
GET /api/auth/github/callback
```
Handles OAuth provider callbacks.

### Articles

#### Get Articles
```
GET /api/articles?page=1&limit=100&search=keyword&isRead=false&isArchived=false
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100)
- `search` (optional): Search in title, content, excerpt
- `isRead` (optional): Filter by read status
- `isArchived` (optional): Filter by archived status

**Response:**
```json
{
  "articles": [
    {
      "id": "uuid",
      "url": "https://example.com/article",
      "title": "Article Title",
      "excerpt": "Article excerpt...",
      "author": "Author Name",
      "publishedDate": "2024-01-01T00:00:00.000Z",
      "tags": ["tag1", "tag2"],
      "isRead": false,
      "isArchived": false,
      "savedAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 500,
    "totalPages": 5
  }
}
```

#### Get Single Article
```
GET /api/articles/:id
Authorization: Bearer <token>
```

#### Save Article
```
POST /api/articles
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com/article",
  "title": "Optional Title",
  "tags": ["optional", "tags"]
}
```

#### Update Article
```
PUT /api/articles/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "tags": ["updated", "tags"],
  "isRead": true,
  "isArchived": false
}
```

#### Delete Article
```
DELETE /api/articles/:id
Authorization: Bearer <token>
```

#### Bulk Delete
```
DELETE /api/articles
Authorization: Bearer <token>
Content-Type: application/json

{
  "articleIds": ["uuid1", "uuid2", "uuid3"]
}
```

### Pocket Import

#### Get Access Token
```
POST /api/pocket/request
```

**Response:**
```json
{
  "authUrl": "https://getpocket.com/auth/authorize?request_token=...",
  "requestToken": "token"
}
```

#### Exchange Token
```
GET /api/pocket/callback?request_token=token
```

#### Start Import
```
POST /api/pocket/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "pocketAccessToken": "pocket-token",
  "sessionId": "import-session-id"
}
```

#### Get Import Progress
```
GET /api/pocket/progress/:sessionId
Authorization: Bearer <token>
```

**Response (SSE):**
```
data: {"progress":25,"processed":250,"total":1000,"status":"running"}
data: {"progress":50,"processed":500,"total":1000,"status":"running"}
data: {"progress":100,"processed":1000,"total":1000,"status":"completed"}
```

### Account Linking

#### Get Linked Accounts
```
GET /api/account-linking
Authorization: Bearer <token>
```

#### Link Account
```
POST /api/account-linking/link
Authorization: Bearer <token>
Content-Type: application/json

{
  "linkingToken": "token-from-oauth",
  "verificationCode": "123456"
}
```

#### Unlink Account
```
DELETE /api/account-linking/:linkedUserId
Authorization: Bearer <token>
```

### Sync

#### Get Sync Status
```
GET /api/sync/status
Authorization: Bearer <token>
```

#### Sync Articles
```
POST /api/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "articles": [
    {
      "id": "uuid",
      "url": "https://example.com",
      "title": "Title",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "lastSyncedAt": "2024-01-01T00:00:00.000Z"
}
```

## Error Responses

All errors follow this format:
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Status Code | Name | Description |
|------------|------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `204` | No Content | Request successful, no content to return |
| `400` | Bad Request | Invalid request format or parameters |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Valid token but insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource already exists |
| `422` | Unprocessable Entity | Validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | Server temporarily unavailable |

### Application Error Codes

| Error Code | Description | HTTP Status |
|-----------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | Invalid email or password | 401 |
| `AUTH_TOKEN_EXPIRED` | JWT token has expired | 401 |
| `AUTH_TOKEN_INVALID` | JWT token is invalid | 401 |
| `AUTH_USER_EXISTS` | Email already registered | 409 |
| `ARTICLE_NOT_FOUND` | Article does not exist | 404 |
| `ARTICLE_DUPLICATE` | Article URL already saved | 409 |
| `VALIDATION_ERROR` | Request validation failed | 422 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `POCKET_AUTH_FAILED` | Pocket authentication failed | 401 |
| `POCKET_IMPORT_IN_PROGRESS` | Import already running | 409 |
| `SERVER_ERROR` | Internal server error | 500 |

## Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

## Pagination

Paginated endpoints return:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 500,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Rate Limiting Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```
## API Changelog

### Version 1.0.0 (Initial Release)
- Authentication endpoints (register, login, logout)
- Article CRUD operations
- Pocket import functionality
- Account synchronization
- Rate limiting implementation

### Future Versions
- Webhook support for real-time updates
- Batch operations for articles
- Enhanced search with filters
- Export functionality
