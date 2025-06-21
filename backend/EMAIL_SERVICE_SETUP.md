# Email Service Setup Guide

This guide explains how to configure the enterprise-grade email verification service for Article Saver.

## Overview

The email service is used for:
- Account linking verification codes
- Security alerts
- Account linked notifications
- Future: password reset, welcome emails, etc.

## Configuration

### 1. Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
SMTP_HOST="smtp.gmail.com"              # Your SMTP server
SMTP_PORT=587                           # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                       # true for port 465, false for other ports
SMTP_USER="your-email@example.com"      # Your email address
SMTP_PASS="your-app-specific-password"  # Your email password or app-specific password
EMAIL_FROM="Article Saver <noreply@articlesaver.com>"
EMAIL_REPLY_TO="support@articlesaver.com"

# Email Rate Limiting
EMAIL_RATE_LIMIT_MAX=50                 # Max emails per window
EMAIL_RATE_LIMIT_WINDOW_MS=3600000      # Time window (1 hour)
```

### 2. Gmail Setup (Recommended for Development)

1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated password
3. Use this configuration:
   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER="your-gmail@gmail.com"
   SMTP_PASS="your-app-specific-password"
   ```

### 3. Other Email Providers

#### SendGrid
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

#### AWS SES
```env
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-ses-smtp-username"
SMTP_PASS="your-ses-smtp-password"
```

#### Mailgun
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="postmaster@your-domain.mailgun.org"
SMTP_PASS="your-mailgun-password"
```

## Database Setup

Run the Prisma migration to create the verification_codes table:

```bash
npm run db:generate
npm run db:push
```

## Testing the Email Service

### 1. Check Configuration Status
```bash
curl http://localhost:3003/api/email-test/config-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Test Connection
```bash
curl http://localhost:3003/api/email-test/test-connection \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Send Test Email (Development Only)
```bash
# Verification email
curl -X POST http://localhost:3003/api/email-test/test-send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "verification"
  }'

# Security alert
curl -X POST http://localhost:3003/api/email-test/test-send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "security"
  }'

# Account linked notification
curl -X POST http://localhost:3003/api/email-test/test-send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "linked"
  }'
```

## Using Account Linking with Email Verification

### 1. Initiate Account Linking
```bash
curl -X POST http://localhost:3003/api/account-linking/link \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetEmail": "other-account@example.com",
    "targetProvider": "google"
  }'
```

Response:
```json
{
  "message": "Account linking initiated. We've sent a verification code to your email.",
  "linkId": "uuid-here",
  "expiresAt": "2024-01-01T12:15:00Z"
}
```

### 2. Verify with Code
```bash
curl -X POST http://localhost:3003/api/account-linking/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "linkId": "uuid-from-step-1",
    "verificationCode": "123456"
  }'
```

## Security Features

1. **Rate Limiting**: Prevents email bombing
   - Per-user limits: 50 emails per hour
   - Verification code limits: 3 codes per hour

2. **Code Security**:
   - 6-digit numeric codes (1 million combinations)
   - SHA-256 hashed storage
   - 15-minute expiration
   - Maximum 5 attempts per code

3. **Email Security**:
   - TLS encryption enforced
   - SPF/DKIM support (configure at provider level)
   - Secure templates prevent XSS

4. **Audit Logging**:
   - All email sends are logged
   - Verification attempts tracked
   - Account linking actions audited

## Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Ensure SMTP_USER and SMTP_PASS are set in .env
   - Restart the server after updating .env

2. **"Failed to send email"**
   - Check SMTP credentials
   - Verify firewall allows outbound SMTP
   - Check email provider's sending limits

3. **"Rate limit exceeded"**
   - Wait for the rate limit window to reset
   - Adjust EMAIL_RATE_LIMIT_MAX if needed

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL="debug"
```

Check logs:
```bash
npm run logs
```

## Production Checklist

- [ ] Use production email provider (not Gmail)
- [ ] Configure SPF/DKIM records
- [ ] Set up email bounce handling
- [ ] Monitor email delivery rates
- [ ] Implement email unsubscribe mechanism
- [ ] Add email templates for all user actions
- [ ] Set up email analytics tracking
- [ ] Configure backup SMTP provider
- [ ] Implement email queue for reliability
- [ ] Add email preview/testing endpoint for admins