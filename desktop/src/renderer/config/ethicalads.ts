// EthicalAds Configuration
export const ETHICAL_ADS_CONFIG = {
  // Publisher ID - You'll get this when approved by EthicalAds
  PUBLISHER_ID: 'articlesaver', // Replace with your actual publisher ID
  
  // Default keywords for contextual targeting
  DEFAULT_KEYWORDS: [
    'developer-tools',
    'productivity',
    'open-source',
    'read-later',
    'bookmark-manager',
    'article-saver',
    'pocket-alternative'
  ],
  
  // Ad placements
  PLACEMENTS: {
    SIDEBAR: 'sidebar',
    LANDING_PAGE: 'landing-page-ad',
    ARTICLE_LIST: 'article-list-ad'
  },
  
  // Feature flags
  FEATURES: {
    // Only show ads to non-authenticated users
    SHOW_TO_FREE_USERS_ONLY: true,
    // Enable ads in production only
    ENABLED_IN_PRODUCTION: process.env.NODE_ENV === 'production',
    // Minimum pageviews required (EthicalAds requirement)
    MIN_PAGEVIEWS: 50000
  },
  
  // Revenue expectations
  REVENUE: {
    // Expected CPM (Cost Per Mille - per 1000 views)
    EXPECTED_CPM_USD: 2.25,
    // Minimum payment threshold
    MIN_PAYMENT_USD: 50
  }
};

// Helper function to check if ads should be shown
export const shouldShowAds = (): boolean => {
  // Check if user is authenticated
  const isAuthenticated = !!localStorage.getItem('authToken');
  
  // Check environment
  const isProduction = ETHICAL_ADS_CONFIG.FEATURES.ENABLED_IN_PRODUCTION;
  
  // Show ads only to free users in production
  return !isAuthenticated && isProduction;
};