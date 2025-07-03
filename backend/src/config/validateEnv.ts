/**
 * Environment Variable Validation
 * Ensures all required environment variables are set at startup
 */

import logger from '../utils/logger';

interface RequiredEnvVars {
    name: string;
    description: string;
    sensitive?: boolean;
}

const REQUIRED_ENV_VARS: RequiredEnvVars[] = [
    { name: 'DATABASE_URL', description: 'PostgreSQL connection string', sensitive: true },
    { name: 'JWT_SECRET', description: 'Secret key for JWT tokens', sensitive: true },
    { name: 'NODE_ENV', description: 'Environment (development/production)' },
];

const OPTIONAL_ENV_VARS: RequiredEnvVars[] = [
    { name: 'PORT', description: 'Server port (default: 3003)' },
    { name: 'GOOGLE_CLIENT_ID', description: 'Google OAuth client ID' },
    { name: 'GOOGLE_CLIENT_SECRET', description: 'Google OAuth client secret', sensitive: true },
    { name: 'GITHUB_CLIENT_ID', description: 'GitHub OAuth client ID' },
    { name: 'GITHUB_CLIENT_SECRET', description: 'GitHub OAuth client secret', sensitive: true },
    { name: 'POCKET_CONSUMER_KEY', description: 'Pocket API consumer key', sensitive: true },
    { name: 'EMAIL_FROM', description: 'Email sender address' },
    { name: 'EMAIL_HOST', description: 'SMTP host' },
    { name: 'EMAIL_PORT', description: 'SMTP port' },
    { name: 'EMAIL_USER', description: 'SMTP username' },
    { name: 'EMAIL_PASS', description: 'SMTP password', sensitive: true },
];

export function validateEnvironment(): void {
    logger.info('Validating environment variables...');
    
    const missingVars: string[] = [];
    const warnings: string[] = [];
    
    // Check required variables
    for (const envVar of REQUIRED_ENV_VARS) {
        if (!process.env[envVar.name]) {
            missingVars.push(`${envVar.name} - ${envVar.description}`);
        } else if (!envVar.sensitive) {
            logger.debug(`✓ ${envVar.name} is set`);
        } else {
            logger.debug(`✓ ${envVar.name} is set (sensitive - value hidden)`);
        }
    }
    
    // Check optional variables
    for (const envVar of OPTIONAL_ENV_VARS) {
        if (!process.env[envVar.name]) {
            warnings.push(`${envVar.name} - ${envVar.description}`);
        }
    }
    
    // Report results
    if (missingVars.length > 0) {
        logger.error('Missing required environment variables:');
        missingVars.forEach(varInfo => logger.error(`  - ${varInfo}`));
        throw new Error('Required environment variables are missing. Please check your .env file.');
    }
    
    if (warnings.length > 0) {
        logger.warn('Optional environment variables not set:');
        warnings.forEach(varInfo => logger.warn(`  - ${varInfo}`));
    }
    
    // Security checks
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }
    
    if (process.env.NODE_ENV === 'production') {
        // Additional production checks
        if (!process.env.DATABASE_URL?.includes('sslmode=require')) {
            logger.warn('DATABASE_URL should include sslmode=require for production');
        }
        
        if (process.env.LOG_LEVEL === 'debug') {
            logger.warn('LOG_LEVEL is set to debug in production - this may expose sensitive data');
        }
    }
    
    logger.info('✓ Environment validation complete');
}