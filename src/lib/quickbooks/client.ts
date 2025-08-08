import { quickBooksStore } from './store';

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

  constructor() {
    console.log('Initializing QuickBooks client');
    this.clientId = process.env.NEXT_PUBLIC_QB_CLIENT_ID || '';
    this.clientSecret = process.env.NEXT_PUBLIC_QB_CLIENT_SECRET || '';
    this.redirectUri = process.env.NEXT_PUBLIC_QB_REDIRECT_URI || '';
    
    console.log('QuickBooks client initialized:', {
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      hasRedirectUri: !!this.redirectUri,
    });
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
    
    const state = Math.random().toString(36).substring(2);
    
    // Use sandbox authorization endpoint
    return `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}` +
           `&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
           `&scope=${encodeURIComponent(scope)}&state=${state}` +
           `&environment=sandbox`;
  }

  getAlternativeAuthorizationUrl(): string {
    if (!this.clientId) {
      throw new Error('QuickBooks Client ID is not configured');
    }
    
    // Use QuickBooks Online scope with OpenID Connect to get user profile info
    const scope = 'com.intuit.quickbooks.accounting openid';
    
    const state = Math.random().toString(36).substring(2);
    
    // Alternative OAuth endpoint that might work better for standard users
    return `https://oauth.platform.intuit.com/oauth2/v1/authorize?client_id=${this.clientId}` +
           `&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
           `&scope=${encodeURIComponent(scope)}&state=${state}` +
           `&environment=sandbox`;
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
        'redirect_uri': this.redirectUri,
        'environment': 'sandbox'
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
    const response = await fetch('https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo', {
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
        'X-QB-Environment': 'sandbox'
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
    // Only support admin flow: use stored tokens
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