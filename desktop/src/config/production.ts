/**
 * Production configuration for Article Saver Desktop
 * 
 * This file contains production-specific settings that can be updated
 * as the deployment infrastructure evolves.
 */

export const productionConfig = {
  // Backend API URL - Update this when you have your production backend deployed
  // Options:
  // 1. Railway: https://articlesaver.up.railway.app
  // 2. Custom domain: https://api.articlesaver.com
  // 3. Cloudflare tunnel: https://articlesaver.example.cloudflare.com
  apiUrl: process.env.VITE_API_URL || 'https://articlesaver-production.up.railway.app',
  
  // Auto-updater configuration
  autoUpdater: {
    // Check for updates on startup and every 4 hours
    checkInterval: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
    
    // Allow pre-release versions in development
    allowPrerelease: process.env.NODE_ENV === 'development',
    
    // Auto-download updates (user still needs to confirm installation)
    autoDownload: true,
    
    // Update feed URL (uses GitHub releases by default)
    feedUrl: 'https://github.com/nilukush/article_saver/releases'
  },
  
  // Error tracking (when you add Sentry or similar)
  errorTracking: {
    enabled: process.env.NODE_ENV === 'production',
    dsn: process.env.VITE_SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'production',
    sampleRate: 0.1 // 10% of errors
  },
  
  // Analytics (when you add analytics)
  analytics: {
    enabled: false, // Enable when you have analytics set up
    trackingId: process.env.VITE_GA_TRACKING_ID || ''
  },
  
  // Feature flags
  features: {
    // Enable/disable features based on deployment readiness
    pocketImport: true,
    accountLinking: true,
    darkMode: true,
    offlineMode: true,
    bulkOperations: true
  },
  
  // Security settings
  security: {
    // Content Security Policy
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://articlesaver.up.railway.app', 'https://api.github.com']
    },
    
    // Require HTTPS in production
    requireHttps: true
  }
};

// Helper function to get API URL
export function getApiUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3003';
  }
  return productionConfig.apiUrl;
}

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof productionConfig.features): boolean {
  return productionConfig.features[feature] ?? false;
}