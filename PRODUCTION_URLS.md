# 🚀 Article Saver Production URLs & Configuration

## Production Environment

### Backend API
- **URL**: https://articlesaver-production.up.railway.app
- **Health Check**: https://articlesaver-production.up.railway.app/api/health
- **Hosting**: Railway (US West)
- **Database**: Supabase PostgreSQL (Free tier - 500MB)

### OAuth Redirect URLs

#### Google OAuth
- **Production Redirect URI**: `https://articlesaver-production.up.railway.app/api/auth/google/callback`
- **Console**: https://console.cloud.google.com/apis/credentials
- **Client ID**: `628015360597-sv11btaeki3avmvivbjt869al9dcckml.apps.googleusercontent.com`

#### GitHub OAuth
- **Production Redirect URI**: `https://articlesaver-production.up.railway.app/api/auth/github/callback`
- **Settings**: https://github.com/settings/developers
- **Client ID**: `Ov23liGfX6pR7EOl4aU9`
- **Note**: GitHub only allows ONE redirect URL per OAuth app

#### Pocket Integration
- **Redirect URI**: `https://articlesaver-production.up.railway.app/api/pocket/callback`
- **Consumer Key**: `116008-0ffbebed063c7586405ab36`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google/url?port=3000` - Get Google OAuth URL
- `GET /api/auth/github/url?port=3000` - Get GitHub OAuth URL
- `POST /api/auth/verify-token` - Verify JWT token

### Articles
- `GET /api/articles` - Get user's articles (paginated)
- `POST /api/articles` - Create new article
- `GET /api/articles/:id` - Get specific article
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article

### Account Management
- `GET /api/account-linking/linked-accounts` - Get linked accounts
- `POST /api/account-linking/link` - Link accounts
- `DELETE /api/account-linking/unlink/:linkId` - Unlink account

### Pocket Import
- `GET /api/pocket/auth/url` - Start Pocket OAuth flow
- `POST /api/pocket/import` - Import articles from Pocket
- `GET /api/pocket/progress/:sessionId` - Check import progress

## Desktop App Configuration

The desktop app connects to the production backend via environment variables:

```bash
# .env.production
VITE_API_URL=https://articlesaver-production.up.railway.app
```

## Deployment Commands

### Backend Deployment (Railway)
```bash
cd backend
railway up --service article_saver
```

### Desktop App Build
```bash
cd desktop
npm run build
npm run dist
```

## Monitoring & Logs

### View Railway Logs
```bash
railway logs
```

### View Deployment Status
```bash
railway status
```

### Open Railway Dashboard
```bash
railway open
```

## Security Considerations

1. **HTTPS Only** - All production traffic uses HTTPS
2. **CORS Configuration** - Configured to accept requests from desktop app
3. **Rate Limiting** - 100 requests per 15 minutes per IP
4. **JWT Expiration** - Tokens expire after 7 days
5. **Environment Variables** - All secrets stored in Railway environment

## Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch**
   - Ensure redirect URIs match exactly in OAuth provider settings
   - Check for trailing slashes or protocol differences

2. **CORS Errors**
   - Verify CORS_ORIGIN environment variable includes your client URL
   - Check browser console for specific CORS error messages

3. **Database Connection**
   - Verify DATABASE_URL is properly URL-encoded
   - Check Supabase dashboard for connection limits

### Health Checks

Test backend health:
```bash
curl https://articlesaver-production.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "environment": "production",
  "service": "article-saver-backend"
}
```

## Support

For issues or questions:
- Create an issue on GitHub
- Check Railway deployment logs
- Review Supabase connection metrics