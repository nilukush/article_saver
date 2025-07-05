# Privacy Policy for Article Saver

**Last Updated: July 5, 2025**

## Introduction

Article Saver ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our open-source read-later application.

As an open-source project, our code is transparent and available for review at https://github.com/nilukush/article_saver.

## Information We Collect

### Desktop Application

When using the Article Saver desktop application:

- **Local Cache**: Articles fetched from our servers are cached locally for offline reading
- **Cloud Storage**: All articles are stored in our cloud database (Supabase via Railway)
- **No Direct Telemetry**: We do not collect usage statistics or crash reports from the desktop app

### Cloud Service (Required)

Article Saver requires an account to function:

- **Account Information**: Email address and hashed password for authentication
- **Article Data**: URLs, titles, full article content, tags, and reading status
- **Usage Data**: Last sync time, saved timestamps, and reading status
- **Server Logs**: Standard web server logs including IP addresses and request data

### Website (GitHub Pages)

On our landing page at https://nilukush.github.io/article_saver/:

- **Analytics**: We use self-hosted Umami analytics to collect:
  - Page views
  - Referrer information
  - Browser type
  - Country (not specific location)
- **No Cookies**: Our analytics does not use cookies or track individual users
- **No Personal Data**: We do not collect names, email addresses, or other personal information

## How We Use Your Information

We use the information we collect to:

1. **Provide Services**: Enable article saving, syncing, and reading functionality
2. **Maintain Security**: Protect against unauthorized access to your account
3. **Improve Service**: Understand usage patterns to improve the application
4. **Communication**: Send critical service updates
5. **Future Advertising**: We plan to introduce advertisements to support the free service

## Data Storage and Security

### Local Data
- Cached articles stored on your device for offline reading
- Protected by your operating system's security measures
- Cache can be cleared through the application

### Cloud Data
- **In Transit**: Protected by HTTPS/TLS
- **At Rest**: Currently stored in plain text (encryption planned for future updates)
- **Database**: Hosted on Supabase (PostgreSQL)
- **Infrastructure**: Railway platform
- **Passwords**: Hashed using bcrypt
- **Note**: Article content is not currently encrypted

## Third-Party Services

We use the following third-party services:

- **Supabase**: Database hosting (see [Supabase Privacy Policy](https://supabase.com/privacy))
- **Railway**: Backend hosting (see [Railway Privacy Policy](https://railway.app/privacy))
- **GitHub**: Source code and release hosting
- **Umami Analytics**: Privacy-friendly website analytics
- **Future**: Advertising networks (to be determined)

## Your Rights and Choices

You have the right to:

1. **Access**: View all your saved articles through the application
2. **Delete**: Remove individual articles (account deletion coming soon)
3. **Export**: Data export functionality is planned for future release
4. **Modify**: Edit tags and reading status of articles

### Current Limitations

Please note these features are not yet available but are planned:
- Account deletion
- Bulk data export
- Data portability
- Opting out of future advertisements

We are committed to implementing these features to give you full control over your data.

## Children's Privacy

Article Saver is not intended for children under 13. We do not knowingly collect information from children under 13.

## International Data Transfers

For cloud users, your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers.

## Data Retention

- **Local Cache**: Retained until you clear the cache or uninstall
- **Cloud Data**: Retained indefinitely while your account is active
- **Deleted Articles**: Immediately removed from database
- **Future Account Deletion**: Will remove all data within 30 days (feature coming soon)
- **Analytics**: Aggregated website data with no personal identifiers

## Open Source Transparency

As an open-source project:
- Our code is publicly auditable
- Security vulnerabilities can be reported via GitHub
- Community contributions are welcomed
- No hidden data collection or tracking

## Changes to This Policy

We may update this Privacy Policy periodically. Changes will be posted on this page with an updated "Last Updated" date.

## Contact Information

For privacy-related questions or concerns:

- **GitHub Issues**: https://github.com/nilukush/article_saver/issues
- **Email**: nilukush@gmail.com
- **Project Lead**: Via GitHub @nilukush

## Compliance

This privacy policy is designed to comply with:
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Other applicable privacy laws

## Special Provisions

### For EU Users (GDPR)
- **Legal Basis**: Legitimate interests and consent
- **Data Controller**: Article Saver project
- **Right to Object**: Contact us to object to processing
- **Right to Rectification**: Update your data through the app
- **Note**: Full GDPR compliance features are in development

### For California Users (CCPA)
- **Right to Know**: This policy describes what we collect
- **Right to Delete**: Feature coming soon
- **Right to Opt-Out**: We do not sell personal information
- **Non-Discrimination**: Equal service regardless of privacy choices
- **Note**: Full CCPA tools are in development

## Security Measures

We implement appropriate technical and organizational measures including:
- HTTPS/TLS for data in transit
- Password hashing with bcrypt
- Access controls and authentication
- Secure development practices
- Regular updates and patches

### Planned Security Improvements
- End-to-end encryption for article content
- Two-factor authentication
- Regular security audits

## Data Breach Notification

In the event of a data breach affecting cloud users:
- Affected users will be notified within 72 hours
- Notification will include nature of breach and recommended actions
- We will work with authorities as required by law

## Future Changes

As Article Saver evolves, we plan to:
- Implement data export functionality
- Add account deletion features
- Introduce optional encryption
- Launch advertising (with disclosure)
- Enhance privacy controls

We will update this policy before implementing significant changes.

---

**Transparency Note**: Article Saver is in active development. While we strive for privacy, some features like encryption and data export are still being implemented. We are committed to improving privacy protections over time.