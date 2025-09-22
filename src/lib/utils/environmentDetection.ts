/**
 * Environment Detection Utilities
 *
 * Provides intelligent environment detection and automatic sandbox redirects
 * for localhost environments where production QuickBooks companies cannot work
 */

export interface EnvironmentInfo {
  environment: 'sandbox' | 'production';
  isLocalhost: boolean;
  shouldRedirectToSandbox: boolean;
  currentUrl: string;
}

/**
 * Detects current environment and determines if automatic sandbox redirect is needed
 */
export function detectEnvironment(): EnvironmentInfo {
  if (typeof window === 'undefined') {
    // Server-side: return safe defaults
    return {
      environment: 'production',
      isLocalhost: false,
      shouldRedirectToSandbox: false,
      currentUrl: ''
    };
  }

  const currentUrl = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  const envParam = urlParams.get('env');

  // Check if we're on localhost
  const isLocalhost = window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';

  // Determine current environment
  const environment: 'sandbox' | 'production' = envParam === 'sandbox' ? 'sandbox' : 'production';

  // Should redirect to sandbox if:
  // 1. We're on localhost (production won't work)
  // 2. Not already in sandbox mode
  // 3. User hasn't explicitly chosen production (no env param means auto-detect)
  const shouldRedirectToSandbox = isLocalhost &&
                                  environment === 'production' &&
                                  !envParam; // Only auto-redirect if no explicit env choice

  return {
    environment,
    isLocalhost,
    shouldRedirectToSandbox,
    currentUrl
  };
}

/**
 * Automatically redirects to sandbox mode if needed
 * Returns true if redirect was performed, false otherwise
 */
export function autoRedirectToSandbox(): boolean {
  const envInfo = detectEnvironment();

  if (envInfo.shouldRedirectToSandbox) {
    const url = new URL(window.location.href);
    url.searchParams.set('env', 'sandbox');

    console.log('🧪 Auto-redirecting to sandbox mode for localhost testing');
    window.location.href = url.toString();
    return true;
  }

  return false;
}

/**
 * Gets the appropriate redirect URL for manual environment switching
 */
export function getEnvironmentSwitchUrl(targetEnv: 'sandbox' | 'production'): string {
  const url = new URL(window.location.href);

  if (targetEnv === 'sandbox') {
    url.searchParams.set('env', 'sandbox');
  } else {
    url.searchParams.delete('env');
  }

  return url.toString();
}

/**
 * Shows a friendly message about environment limitations
 */
export function getEnvironmentMessage(envInfo: EnvironmentInfo): string | null {
  if (envInfo.isLocalhost && envInfo.environment === 'production') {
    return "⚠️ Production QuickBooks companies cannot connect from localhost due to Intuit's security restrictions. Using sandbox mode instead.";
  }

  if (envInfo.isLocalhost && envInfo.environment === 'sandbox') {
    return "🧪 Using sandbox mode for localhost testing. Switch to production deployment to access real QuickBooks companies.";
  }

  return null;
}