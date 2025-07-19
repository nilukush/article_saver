# EthicalAds Integration Guide for Article Saver

## Overview

Article Saver uses EthicalAds to generate revenue while maintaining user privacy and trust. EthicalAds is the only open-source ad network specifically designed for developer-focused projects.

## Why EthicalAds?

- **Privacy First**: No user tracking, cookies, or personal data collection
- **Developer Focused**: Ads are relevant to our technical audience
- **Open Source**: Both the ad server and client are open source
- **Trusted**: Used by Read the Docs, Pallets Projects, and many others
- **Good Revenue**: $2.00-$2.50 CPM for US/EU traffic

## Implementation Details

### 1. Components Created

- **`EthicalAd.tsx`**: React component for displaying ads
- **`useEthicalAds.ts`**: React hook for managing ad lifecycle
- **`ethicalads.ts`**: Configuration and helper functions
- **`ethical-ads.css`**: Styling for ad placements

### 2. Ad Placements

#### Desktop App
- **Sidebar Ad**: Shows only for non-authenticated users
- Location: Below navigation menu in sidebar
- Type: Text ad
- Visibility: Hidden on mobile screens

#### Landing Page
- **Footer Ad**: Shows for all visitors
- Location: Above the main CTA section
- Type: Text ad
- Visibility: Responsive design for all screen sizes

### 3. User Experience Considerations

- Ads only show for free/non-authenticated users
- Non-intrusive placement that doesn't interfere with content
- Clear "Sponsored" label for transparency
- Loading states to prevent layout shifts
- Smooth animations when ads appear

## Setup Instructions

### Step 1: Apply to EthicalAds

1. Visit [ethicalads.io/publishers](https://www.ethicalads.io/publishers/)
2. Apply with your site details
3. Requirements:
   - 50,000+ monthly pageviews
   - Developer/technical focused content
   - Only one ad per page

### Step 2: Get Your Publisher ID

Once approved, you'll receive a publisher ID. Update it in:

```typescript
// desktop/src/renderer/config/ethicalads.ts
export const ETHICAL_ADS_CONFIG = {
  PUBLISHER_ID: 'your-actual-publisher-id', // Replace this
  ...
}
```

### Step 3: Configure Keywords

Update keywords for better contextual targeting:

```typescript
DEFAULT_KEYWORDS: [
  'developer-tools',
  'productivity',
  'open-source',
  // Add more relevant keywords
]
```

### Step 4: Test Implementation

1. Build the desktop app in production mode:
   ```bash
   cd desktop
   npm run build:prod
   ```

2. Test ad display:
   - Logout to see ads (only shown to free users)
   - Verify ads appear in sidebar
   - Check responsive behavior

### Step 5: Payment Setup

Configure payment method in EthicalAds dashboard:
- PayPal
- Open Collective
- GitHub Sponsors
- Bank transfer (Stripe)

Minimum payment: $50

## Revenue Expectations

Based on traffic and engagement:
- **CPM**: $2.00-$2.50 per 1,000 views
- **Example**: 100,000 pageviews/month ≈ $200-$250/month

## Monitoring & Analytics

EthicalAds provides:
- Real-time reporting dashboard
- Click-through rates
- Revenue tracking
- Geographic breakdown

## Best Practices

1. **Page Keywords**: Add specific keywords for different pages
2. **Ad Placement**: Keep ads above the fold when possible
3. **Mobile**: Consider hiding ads on small screens
4. **Testing**: Use A/B testing for placement optimization

## Troubleshooting

### Ads Not Showing
- Check if user is authenticated (ads only show for free users)
- Verify publisher ID is correct
- Ensure you're in production mode
- Check browser console for errors

### Low Revenue
- Improve keyword targeting
- Ensure ads are above the fold
- Consider ad placement optimization

## Privacy & Compliance

EthicalAds is fully compliant with:
- GDPR
- CCPA
- No cookies or tracking pixels
- No personal data collection

## Support

- EthicalAds Support: support@ethicalads.io
- Documentation: [ethicalads.io/publisher-guide](https://www.ethicalads.io/publisher-guide/)
- Article Saver Issues: [GitHub Issues](https://github.com/nilukush/article_saver/issues)

## Future Enhancements

1. **A/B Testing**: Test different ad placements
2. **Dynamic Keywords**: Page-specific keyword targeting
3. **Dark Mode**: Automatic theme switching for ads
4. **Analytics Integration**: Track ad performance alongside app metrics

---

Remember: The goal is to generate sustainable revenue while maintaining the trust and privacy of our users. EthicalAds aligns perfectly with Article Saver's open-source values.