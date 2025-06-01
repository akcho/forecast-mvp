import { quickBooksStore } from './store';

interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
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
}

export class QuickBooksClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    console.log('Initializing QuickBooks client');
    this.clientId = process.env.QB_CLIENT_ID || '';
    this.clientSecret = process.env.QB_CLIENT_SECRET || '';
    this.redirectUri = process.env.QB_REDIRECT_URI || '';
    
    console.log('QuickBooks client initialized:', {
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      hasRedirectUri: !!this.redirectUri,
    });
  }

  getAuthorizationUrl(): string {
    if (!this.clientId) {
      throw new Error('QuickBooks Client ID is not configured');
    }
    
    // Only use the accounting scope
    const scope = 'com.intuit.quickbooks.accounting';
    
    const state = Math.random().toString(36).substring(2);
    
    // Use sandbox authorization endpoint
    return `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}` +
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

  private async makeRequest<T>(endpoint: string, type: string): Promise<T> {
    const accessToken = quickBooksStore.getAccessToken();
    const realmId = quickBooksStore.getRealmId();

    if (!accessToken || !realmId) {
      throw new Error('Not authenticated with QuickBooks');
    }

    const response = await fetch(`/api/quickbooks/${endpoint}${type ? `?type=${type}` : ''}`, {
      headers: {
        'X-QB-Access-Token': accessToken,
        'X-QB-Realm-ID': realmId,
      },
    });

    if (response.status === 401 || response.status === 403) {
      const tokens = await this.refreshAccessToken();
      quickBooksStore.setTokens(tokens.access_token, tokens.refresh_token);

      const retryResponse = await fetch(`/api/quickbooks/${endpoint}${type ? `?type=${type}` : ''}`, {
        headers: {
          'X-QB-Access-Token': tokens.access_token,
          'X-QB-Realm-ID': realmId,
        },
      });

      if (!retryResponse.ok) {
        throw new Error(`Failed to fetch ${endpoint} after token refresh`);
      }
      return retryResponse.json();
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}`);
    }
    return response.json();
  }

  async getBalanceSheet(): Promise<QuickBooksReport> {
    try {
      return await this.makeRequest<QuickBooksReport>('reports', 'balance-sheet');
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      throw error;
    }
  }

  async getProfitAndLoss(): Promise<QuickBooksReport> {
    try {
      return await this.makeRequest<QuickBooksReport>('reports', 'profit-loss');
    } catch (error) {
      console.error('Error fetching profit and loss:', error);
      throw error;
    }
  }

  async getCashFlow(): Promise<QuickBooksReport> {
    try {
      return await this.makeRequest<QuickBooksReport>('reports', 'cash-flow');
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      throw error;
    }
  }

  async getCompanyInfo(): Promise<QuickBooksCompanyInfo> {
    try {
      return await this.makeRequest<QuickBooksCompanyInfo>('company', '');
    } catch (error) {
      console.error('Error fetching company info:', error);
      throw error;
    }
  }

  setRealmId(realmId: string) {
    quickBooksStore.setRealmId(realmId);
  }
} 