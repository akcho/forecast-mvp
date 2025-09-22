import { quickBooksStore } from './store';
import { getOAuthEnvironmentParam, getUserInfoEndpoint, getEnvironmentName, getQuickBooksConfig } from '@/lib/quickbooks/config';

interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
}

interface QuickBooksUserInfo {
  sub: string; // QuickBooks user GUID
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  address?: {
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}

interface QuickBooksCompanyInfo {
  QueryResponse: {
    CompanyInfo: Array<{
      CompanyName: string;
      LegalName: string;
      CompanyAddr: {
        Line1: string;
        City: string;
        CountrySubDivisionCode: string;
        PostalCode: string;
      };
      Email: {
        Address: string;
      };
      WebAddr: {
        URI: string;
      };
    }>;
  };
}

interface QuickBooksReport {
  QueryResponse: {
    Report: {
      Header: {
        Time: string;
        ReportName: string;
        DateMacro: string;
        ReportBasis: string;
        StartPeriod: string;
        EndPeriod: string;
        Currency: string;
      };
      Columns: {
        Column: Array<{
          ColTitle: string;
          ColType: string;
        }>;
      };
      Rows: {
        Row: Array<{
          Header: {
            ColData: Array<{
              value: string;
            }>;
          };
          Rows?: {
            Row: Array<any>;
          };
          Summary?: {
            ColData: Array<{
              value: string;
            }>;
          };
          type: string;
        }>;
      };
    };
  };
}

export class QuickBooksClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private environment: 'sandbox' | 'production';

  constructor(requestUrl?: string) {
    console.log('Initializing QuickBooks client');

    // Detect environment from URL parameter
    this.environment = this.detectEnvironment(requestUrl);

    // Detect deployment status
    const isDeployed = process.env.VERCEL_URL !== undefined ||
                      process.env.NODE_ENV === 'production';

    // Select credentials based on environment and deployment
    const credentials = this.getCredentials(this.environment, isDeployed);
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;

    // Select redirect URI based on deployment only
    this.redirectUri = this.getRedirectUri(isDeployed);

    console.log('QuickBooks client initialized:', {
      environment: this.environment,
      isDeployed,
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      hasRedirectUri: !!this.redirectUri,
      redirectUri: this.redirectUri
    });
  }

  private detectEnvironment(requestUrl?: string): 'sandbox' | 'production' {
    // Server-side: use provided request URL
    if (requestUrl) {
      try {
        const url = new URL(requestUrl);
        const envParam = url.searchParams.get('env');
        return envParam === 'sandbox' ? 'sandbox' : 'production';
      } catch (error) {
        return 'production'; // Default if URL parsing fails
      }
    }

    // Client-side: use window.location
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const envParam = urlParams.get('env');
      return envParam === 'sandbox' ? 'sandbox' : 'production';
    }

    // Default for SSR
    return 'production';
  }

  private getCredentials(environment: 'sandbox' | 'production', isDeployed: boolean) {
    // Use production credentials for production environment OR when deployed
    const useProductionCredentials = environment === 'production' || isDeployed;

    return {
      clientId: useProductionCredentials
        ? process.env.PRODUCTION_QB_CLIENT_ID || ''
        : process.env.QB_CLIENT_ID || '',
      clientSecret: useProductionCredentials
        ? process.env.PRODUCTION_QB_CLIENT_SECRET || ''
        : process.env.QB_CLIENT_SECRET || ''
    };
  }

  private getRedirectUri(isDeployed: boolean): string {
    // Always use localhost redirect for local development
    return isDeployed
      ? process.env.PRODUCTION_REDIRECT_URI || 'https://app.netflo.ai/api/quickbooks/callback'
      : process.env.DEVELOPMENT_REDIRECT_URI || 'http://localhost:3000/api/quickbooks/callback';
  }

  // Check if user is admin (has direct tokens) or team member (should use shared connection)
  private isAdmin(): boolean {
    const accessToken = quickBooksStore.getAccessToken();
    const refreshToken = quickBooksStore.getRefreshToken();
    const realmId = quickBooksStore.getRealmId();
    return !!(accessToken && refreshToken && realmId);
  }

  getAuthorizationUrl(): string {
    if (!this.clientId) {
      throw new Error('QuickBooks Client ID is not configured');
    }

    // Use QuickBooks Online scope with OpenID Connect to get user profile info
    const scope = 'com.intuit.quickbooks.accounting openid';

    // Encode environment in state parameter for callback detection
    const randomState = Math.random().toString(36).substring(2);
    const state = `${this.environment}_${randomState}`;

    // Use environment-specific parameter - this is critical for sandbox mode
    const environmentParam = this.environment === 'sandbox' ? '&environment=sandbox' : '';

    return `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}` +
           `&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
           `&scope=${encodeURIComponent(scope)}&state=${state}${environmentParam}`;
  }

  getAuthorizationUrlWithRedirectUri(redirectUri: string): string {
    if (!this.clientId) {
      throw new Error('QuickBooks Client ID is not configured');
    }

    // Use QuickBooks Online scope with OpenID Connect to get user profile info
    const scope = 'com.intuit.quickbooks.accounting openid';

    const state = Math.random().toString(36).substring(2);

    // Use dynamic environment parameter
    const environmentParam = getOAuthEnvironmentParam();
    return `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}` +
           `&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
           `&scope=${encodeURIComponent(scope)}&state=${state}${environmentParam}`;
  }

  getAlternativeAuthorizationUrl(): string {
    if (!this.clientId) {
      throw new Error('QuickBooks Client ID is not configured');
    }

    // Use QuickBooks Online scope with OpenID Connect to get user profile info
    const scope = 'com.intuit.quickbooks.accounting openid';

    const state = Math.random().toString(36).substring(2);

    // Alternative OAuth endpoint that might work better for standard users
    const environmentParam = getOAuthEnvironmentParam();
    return `https://oauth.platform.intuit.com/oauth2/v1/authorize?client_id=${this.clientId}` +
           `&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
           `&scope=${encodeURIComponent(scope)}&state=${state}${environmentParam}`;
  }

  async exchangeCodeForTokens(code: string): Promise<QuickBooksTokens> {
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    // Use sandbox token endpoint
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': this.redirectUri
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  }

  async getUserInfo(accessToken: string): Promise<QuickBooksUserInfo> {
    const response = await fetch(getUserInfoEndpoint(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('User info fetch error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error('Failed to fetch user profile information');
    }

    const userInfo = await response.json();
    return userInfo as QuickBooksUserInfo;
  }

  private async refreshAccessToken(): Promise<QuickBooksTokens> {
    const refreshToken = quickBooksStore.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/quickbooks/refresh', {
      method: 'POST',
      headers: {
        'X-QB-Refresh-Token': refreshToken,
        'X-QB-Environment': getEnvironmentName()
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    quickBooksStore.setTokens(data.access_token, data.refresh_token);

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    try {
      const accessToken = quickBooksStore.getAccessToken();
      const realmId = quickBooksStore.getRealmId();

      if (!accessToken || !realmId) {
        throw new Error('Not authenticated with QuickBooks');
      }

      // Test the tokens with a simple API call
      const testResponse = await fetch(`/api/quickbooks/company`, {
        method: 'GET',
        headers: {
          'X-QB-Access-Token': accessToken,
          'X-QB-Realm-ID': realmId,
        },
      });

      if (!testResponse.ok) {
        // Clear tokens if invalid
        quickBooksStore.clear();
        throw new Error('QuickBooks tokens are invalid or expired. Please reconnect your QuickBooks account.');
      }

      const headers: Record<string, string> = {
        'X-QB-Access-Token': accessToken,
        'X-QB-Realm-ID': realmId,
      };

      // Build URL with query parameters
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const url = new URL(`/api/quickbooks/${endpoint}`, baseUrl);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        // @ts-ignore
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        // Check for specific token expiration error
        if (response.status === 401 && errorData.code === 'TOKEN_EXPIRED') {
          quickBooksStore.clear();
          throw new Error('QuickBooks tokens have expired. Please reconnect your QuickBooks account.');
        }
        throw new Error(`API request failed: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      // Clear tokens on any error
      quickBooksStore.clear();
      throw error;
    }
  }

  async getBalanceSheet(params: Record<string, string> = {}): Promise<QuickBooksReport> {
    return this.makeRequest('balance-sheet', params);
  }

  async getProfitAndLoss(params: Record<string, string> = {}): Promise<QuickBooksReport> {
    return this.makeRequest('profit-loss', params);
  }

  async getCashFlow(params: Record<string, string> = {}): Promise<QuickBooksReport> {
    return this.makeRequest('cash-flow', params);
  }

  async getCompanyInfo(): Promise<QuickBooksCompanyInfo> {
    return this.makeRequest('company');
  }

  async getTransactions() {
    return this.makeRequest('transactions');
  }

  async getLists() {
    return this.makeRequest('lists');
  }

  setRealmId(realmId: string) {
    quickBooksStore.setRealmId(realmId);
  }
} 