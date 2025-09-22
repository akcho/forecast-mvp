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
 * Get QuickBooks configuration based on environment parameter or URL detection
 */
export function getQuickBooksConfig(environment?: 'sandbox' | 'production'): QuickBooksConfig {
  // Use provided environment or detect from URL
  const env = environment || detectEnvironmentFromUrl();

  const baseUrl = env === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';

  const discoveryDocumentUrl = env === 'production'
    ? 'https://appcenter.intuit.com/api/v1/connection/oauth2'
    : 'https://appcenter.intuit.com/api/v1/connection/oauth2';

  return {
    environment: env,
    baseUrl,
    discoveryDocumentUrl,
    isProduction: env === 'production',
    isSandbox: env === 'sandbox'
  };
}

/**
 * Detect environment from current URL (client-side)
 */
function detectEnvironmentFromUrl(): 'sandbox' | 'production' {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('env') === 'sandbox' ? 'sandbox' : 'production';
  }
  return 'production'; // Default for SSR
}

/**
 * Generate QuickBooks API URL for a specific endpoint
 */
export function getQuickBooksApiUrl(realmId: string, endpoint: string, environment?: 'sandbox' | 'production'): string {
  const config = getQuickBooksConfig(environment);
  return `${config.baseUrl}/v3/company/${realmId}/${endpoint}`;
}

/**
 * Generate OAuth authorization URL with proper environment
 */
export function getOAuthEnvironmentParam(environment?: 'sandbox' | 'production'): string {
  const env = environment || detectEnvironmentFromUrl();
  return env === 'sandbox' ? '&environment=sandbox' : '';
}

/**
 * Get environment-appropriate token endpoint
 */
export function getTokenEndpoint(): string {
  return 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
}

/**
 * Get environment-appropriate UserInfo endpoint
 */
export function getUserInfoEndpoint(environment?: 'sandbox' | 'production'): string {
  const env = environment || detectEnvironmentFromUrl();
  return env === 'production'
    ? 'https://accounts.platform.intuit.com/v1/openid_connect/userinfo'
    : 'https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo';
}

/**
 * Get current environment name for API headers
 */
export function getEnvironmentName(environment?: 'sandbox' | 'production'): string {
  return environment || detectEnvironmentFromUrl();
}

/**
 * Extract environment from OAuth state parameter
 */
export function getEnvironmentFromState(state: string): 'sandbox' | 'production' | null {
  if (!state) return null;

  const parts = state.split('_');
  if (parts.length >= 2 && (parts[0] === 'sandbox' || parts[0] === 'production')) {
    return parts[0] as 'sandbox' | 'production';
  }

  return null;
}

/**
 * Get QuickBooks API URL for a specific endpoint with explicit environment
 */
export function getQuickBooksApiUrlForEnvironment(realmId: string, endpoint: string, environment: 'sandbox' | 'production'): string {
  const baseUrl = environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
  return `${baseUrl}/v3/company/${realmId}/${endpoint}`;
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