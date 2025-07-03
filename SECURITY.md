# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **DO NOT** create a public GitHub issue
2. **Report privately** via one of these methods:
   - Create a [Security Advisory](https://github.com/nilukush/article_saver/security/advisories/new) on GitHub
   - Email: Open an issue asking for security contact (we'll provide a secure channel)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to acknowledge receipt within 48 hours and provide a detailed response within 5 business days.

## Scope

### In Scope
- Authentication and authorization issues
- Data exposure or leakage
- Cross-site scripting (XSS)
- SQL injection vulnerabilities
- Remote code execution
- Privilege escalation
- Denial of service vulnerabilities

### Out of Scope
- Vulnerabilities in third-party services (Pocket API, OAuth providers)
- Issues that require physical access to a user's device
- Social engineering attacks
- Vulnerabilities in outdated versions (please update first)

## Disclosure Policy

We follow a coordinated disclosure timeline:
1. Reporter submits vulnerability
2. We acknowledge and investigate (48 hours)
3. We develop and test a fix
4. We release the fix
5. We publicly disclose after 90 days or when fix is widely deployed

## Recognition

We appreciate security researchers who help keep Article Saver secure. With your permission, we'll acknowledge your contribution in our security advisories.

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
