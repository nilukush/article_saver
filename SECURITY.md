# Security Policy

## Our Commitment to Security

The Article Saver team takes the security of our software seriously. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within Article Saver, please follow these steps:

### Where to Report

**DO NOT** report security vulnerabilities through public GitHub issues.

Instead, please report them via one of these methods:
1. Email: security@articlesaver.app (preferred)
2. GitHub Security Advisories: [Report a vulnerability](https://github.com/yourusername/article_saver/security/advisories/new)

### What to Include

Please include the following information:
- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What Not to Do

- Do not exploit the vulnerability beyond what is necessary to demonstrate it
- Do not access, modify, or delete other users' data
- Do not perform any attacks against our infrastructure or users
- Do not publicly disclose the vulnerability before we've had a chance to address it

## Response Timeline

- **Initial Response**: Within 48 hours
- **Triage and Assessment**: Within 7 days
- **Patch Development**: Within 30 days for critical vulnerabilities
- **Public Disclosure**: Within 90 days, or sooner if patch is released

## Security Update Process

When we receive a security report, our process is:

1. **Confirm the vulnerability** - Reproduce and verify the issue
2. **Assess severity** - Determine CVSS score and impact
3. **Develop fix** - Create and test security patch
4. **Release patch** - Deploy fix with security advisory
5. **Notify users** - Announce through our channels
6. **Credit reporter** - Acknowledge contribution (if desired)

### Severity Levels

- **Critical (CVSS 9.0-10.0)**: Patches released immediately
- **High (CVSS 7.0-8.9)**: Patches released within 7 days
- **Medium (CVSS 4.0-6.9)**: Patches released within 30 days
- **Low (CVSS 0.1-3.9)**: Patches released in next regular update

## Security Best Practices for Contributors

### Code Security
- Always validate and sanitize user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Follow the principle of least privilege
- Never commit secrets or credentials

### Dependencies
- Keep all dependencies up to date
- Review dependency licenses
- Use `npm audit` regularly
- Pin dependency versions in production

### Sensitive Data
- Never log sensitive information
- Use environment variables for configuration
- Implement proper encryption for data at rest
- Use HTTPS for all communications
- Follow GDPR and privacy regulations

### Electron Security
- Enable context isolation
- Disable Node.js integration in renderers
- Validate all IPC inputs
- Use Content Security Policy
- Disable remote module

### Pull Request Security Checklist
Before submitting a PR, ensure:
- [ ] No secrets or credentials included
- [ ] All inputs are validated
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Dependencies are up to date
- [ ] Security headers are maintained
- [ ] Error messages don't leak sensitive info

## Known Security Considerations

### Current Security Measures
- JWT-based authentication
- bcrypt password hashing (12 rounds)
- Rate limiting on API endpoints
- CORS properly configured
- Helmet.js for security headers
- Input validation with express-validator
- Prisma ORM preventing SQL injection

### Areas Under Review
- Content Security Policy optimization
- WebAuthn implementation
- End-to-end encryption for sensitive data
- Security audit logging
- Penetration testing results

## Security Headers

Our application implements the following security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`

## Vulnerability Disclosure Policy

We follow a coordinated disclosure policy:
1. Reporter submits vulnerability
2. We acknowledge within 48 hours
3. We work on a fix
4. We notify the reporter when fix is ready
5. We coordinate public disclosure
6. We credit the reporter (if desired)

## Acknowledgments

We would like to thank the following security researchers for responsibly disclosing vulnerabilities:

| Name | Vulnerability | Date |
|------|--------------|------|
| *Your name here* | *Description* | *Date* |

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)

## Contact

For any security concerns, please contact:
- Email: security@articlesaver.app
- GPG Key: [Download public key](https://articlesaver.app/security.asc)

---

*This security policy is subject to change. Last updated: [Current Date]*