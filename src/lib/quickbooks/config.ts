/**
 * Centralized QuickBooks environment configuration
 * Provides consistent environment detection and URL generation
 */

export interface QuickBooksConfig {
  environment: 'sandbox' | 'production';
  baseUrl: string;
  discoveryDocumentUrl: string;
  isProduction: boolean;
  isSandbox: boolean;
}

/**
 * Get QuickBooks configuration based on environment variable
 */
export function getQuickBooksConfig(): QuickBooksConfig {
  const environment = (process.env.QB_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

  const baseUrl = environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';

  const discoveryDocumentUrl = environment === 'production'
    ? 'https://appcenter.intuit.com/api/v1/connection/oauth2'
    : 'https://appcenter.intuit.com/api/v1/connection/oauth2';

  return {
    environment,
    baseUrl,
    discoveryDocumentUrl,
    isProduction: environment === 'production',
    isSandbox: environment === 'sandbox'
  };
}

/**
 * Generate QuickBooks API URL for a specific endpoint
 */
export function getQuickBooksApiUrl(realmId: string, endpoint: string): string {
  const config = getQuickBooksConfig();
  return `${config.baseUrl}/v3/company/${realmId}/${endpoint}`;
}

/**
 * Generate OAuth authorization URL with proper environment
 */
export function getOAuthEnvironmentParam(): string {
  const config = getQuickBooksConfig();
  return config.isProduction ? '' : '&environment=sandbox';
}

/**
 * Get environment-appropriate token endpoint
 */
export function getTokenEndpoint(): string {
  return 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
}

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const environment = process.env.QB_ENVIRONMENT;

  if (environment && !['sandbox', 'production'].includes(environment)) {
    errors.push(`Invalid QB_ENVIRONMENT: ${environment}. Must be 'sandbox' or 'production'`);
  }

  if (!environment) {
    warnings.push('QB_ENVIRONMENT not set, defaulting to sandbox');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}