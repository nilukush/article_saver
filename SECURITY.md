# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **DO NOT** create a public GitHub issue
2. Email the details to: security@articlesaver.com (or your actual security email)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 5 business days.

## Security Best Practices

This project follows security best practices:

- ✅ No credentials in source code
- ✅ Environment variables for sensitive configuration
- ✅ Regular dependency updates via Dependabot
- ✅ Secure authentication with JWT tokens
- ✅ Input validation and sanitization
- ✅ SQL injection prevention via Prisma ORM
- ✅ XSS protection in React components
- ✅ HTTPS enforcement in production

## Configuration

### Environment Variables

All sensitive configuration is managed through environment variables. See `.env.example` files for templates.

### OAuth Setup

When setting up OAuth providers:
1. Client IDs can be public (less sensitive)
2. Client Secrets must NEVER be committed
3. Use environment variables for all secrets
4. Restrict OAuth redirect URIs in provider settings

## Dependencies

We use automated tools to keep dependencies secure:
- GitHub Dependabot for vulnerability alerts
- Regular manual security audits
- Automated testing for security regressions
