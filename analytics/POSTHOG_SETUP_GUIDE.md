# PostHog Analytics Setup for Article Saver

## Why PostHog?
- Used by Supabase, Y Combinator startups
- Free for 1M events/month
- 2-hour setup
- Includes session recordings, A/B testing, feature flags

## Quick Setup (2 Hours)

### Option 1: PostHog Cloud (Fastest - 15 mins)
1. Sign up at https://posthog.com
2. Create project
3. Get your API key
4. Add to Article Saver

### Option 2: Self-Hosted (Recommended - 2 hours)

#### Step 1: Deploy PostHog
```bash
# Clone and run
git clone https://github.com/PostHog/posthog
cd posthog
docker-compose up -d

# Access at http://localhost:8000
# Default: admin@posthog.com / password
```

#### Step 2: Add to Backend
```bash
cd backend
npm install posthog-node
```

```typescript
// backend/src/services/analytics.ts
import { PostHog } from 'posthog-node'

const posthog = new PostHog(
  process.env.POSTHOG_API_KEY || 'phc_your_project_api_key',
  { host: process.env.POSTHOG_HOST || 'http://localhost:8000' }
)

export const trackEvent = (userId: string, event: string, properties?: any) => {
  posthog.capture({
    distinctId: userId,
    event,
    properties: {
      ...properties,
      source: 'backend'
    }
  })
}

// Track key events
export const trackUserSignup = (userId: string, email: string) => {
  trackEvent(userId, 'User Signed Up', { email })
}

export const trackArticleSaved = (userId: string, articleId: string, url: string) => {
  trackEvent(userId, 'Article Saved', { articleId, url })
}

export const trackArticleRead = (userId: string, articleId: string) => {
  trackEvent(userId, 'Article Read', { articleId })
}
```

#### Step 3: Add to Frontend
```typescript
// desktop/src/renderer/utils/analytics.ts
import posthog from 'posthog-js'

// Initialize PostHog
posthog.init('phc_your_project_api_key', {
  api_host: process.env.VITE_POSTHOG_HOST || 'http://localhost:8000',
  autocapture: true,
  capture_pageview: true,
  capture_pageleave: true
})

export const analytics = {
  identify: (userId: string, traits?: any) => {
    posthog.identify(userId, traits)
  },
  
  track: (event: string, properties?: any) => {
    posthog.capture(event, properties)
  },
  
  // Feature flags
  isFeatureEnabled: (flag: string): boolean => {
    return posthog.isFeatureEnabled(flag) || false
  }
}
```

#### Step 4: Track Key Metrics
```typescript
// In your auth flow
analytics.identify(user.id, {
  email: user.email,
  createdAt: user.createdAt
})
analytics.track('User Logged In')

// When saving articles
analytics.track('Article Saved', {
  url: article.url,
  source: 'manual' // or 'import', 'extension'
})

// When reading
analytics.track('Article Read', {
  articleId: article.id,
  readingTime: timeSpent
})
```

## Pre-Built Dashboards

### Dashboard 1: User Analytics
- Total users
- Daily/Weekly/Monthly Active Users
- User retention cohorts
- Signup funnel

### Dashboard 2: Feature Usage
- Articles saved per user
- Most used features
- Feature adoption rates
- Time to first article

### Dashboard 3: Content Analytics
- Popular domains
- Reading patterns
- Tag usage
- Import success rates

### Dashboard 4: Session Recordings
- Watch real user sessions
- Identify UX issues
- See where users struggle

## Configuration

### Environment Variables
```env
# Backend
POSTHOG_API_KEY=phc_your_project_api_key
POSTHOG_HOST=http://localhost:8000

# Frontend
VITE_POSTHOG_API_KEY=phc_your_project_api_key
VITE_POSTHOG_HOST=http://localhost:8000
```

### Privacy-Friendly Setup
```javascript
// Respect user privacy
posthog.init('your-key', {
  autocapture: false, // Manually track events
  mask_all_text: true, // Mask sensitive text
  mask_all_element_attributes: true,
  disable_session_recording: false // Keep recordings but mask content
})
```

## Maintenance

### Daily (Automated)
- Events tracked automatically
- Dashboards update in real-time

### Weekly
- Review session recordings
- Check funnel drop-offs
- A/B test results

### Monthly
- User interviews based on behavior
- Feature flag cleanup
- Performance optimization

## Scaling

### Current (2 users)
- Run on your laptop
- ~10MB disk usage

### Growth (100 users)
- Same setup works
- ~1GB disk usage

### Scale (1000+ users)
- Move to dedicated server
- Or migrate to PostHog Cloud

## Cost Analysis

### Self-Hosted
- 2-100 users: $0 (run on existing server)
- 100-1000 users: $5/month (small VPS)
- 1000+ users: $20/month (better VPS)

### PostHog Cloud
- Up to 1M events: $0
- 1-10M events: $0
- Only pay for premium features

## Why Founders Love PostHog

1. **Session Recordings**: See exactly what users do
2. **Feature Flags**: Roll out features gradually
3. **A/B Testing**: Make data-driven decisions
4. **No SQL Required**: Point and click dashboards
5. **Export Anywhere**: Your data, always accessible

## Quick Wins

After setup, you'll immediately see:
- How long users spend in your app
- Which features they use most
- Where they get stuck
- What makes them return

## Next Steps

1. Deploy PostHog (1 hour)
2. Add tracking code (30 mins)
3. Watch first session recording (mind-blowing!)
4. Share dashboard with co-founder
5. Make first data-driven decision

Remember: PostHog is what Supabase uses. If it's good enough for them, it's perfect for Article Saver.