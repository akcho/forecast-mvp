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
      console.log('Fetching balance sheet...');
      const response = await this.makeRequest<QuickBooksReport>('reports', 'balance-sheet');
      console.log('Balance sheet response:', {
        hasData: !!response,
        hasQueryResponse: !!response?.QueryResponse,
        hasReport: !!response?.QueryResponse?.Report,
        dataKeys: Object.keys(response || {}),
        reportStructure: response?.QueryResponse?.Report ? {
          keys: Object.keys(response.QueryResponse.Report),
          hasRows: !!response.QueryResponse.Report.Rows,
          rowsType: typeof response.QueryResponse.Report.Rows,
          rowsKeys: response.QueryResponse.Report.Rows ? Object.keys(response.QueryResponse.Report.Rows) : [],
          firstRow: response.QueryResponse.Report.Rows?.Row?.[0]
        } : null
      });
      return response;
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      throw error;
    }
  }

  async getProfitAndLoss(): Promise<QuickBooksReport> {
    try {
      console.log('Fetching profit and loss...');
      const response = await this.makeRequest<QuickBooksReport>('reports', 'profit-loss');
      console.log('Profit and loss response:', {
        hasData: !!response,
        hasQueryResponse: !!response?.QueryResponse,
        hasReport: !!response?.QueryResponse?.Report,
        dataKeys: Object.keys(response || {}),
      });
      return response;
    } catch (error) {
      console.error('Error fetching profit and loss:', error);
      throw error;
    }
  }

  async getCashFlow(): Promise<QuickBooksReport> {
    try {
      console.log('Fetching cash flow...');
      const response = await this.makeRequest<QuickBooksReport>('reports', 'cash-flow');
      console.log('Cash flow response:', {
        hasData: !!response,
        hasQueryResponse: !!response?.QueryResponse,
        hasReport: !!response?.QueryResponse?.Report,
        dataKeys: Object.keys(response || {}),
      });
      return response;
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

  async getTransactions() {
    try {
      const transactionTypes = ['Purchase', 'Invoice', 'Payment', 'Bill'];
      
      const queries = transactionTypes.map(type => `
        SELECT * FROM ${type}
        ORDER BY TxnDate DESC
      `);

      const responses = await Promise.all(
        queries.map(query => 
          fetch('/api/quickbooks/query', {
            method: 'POST',
            headers: {
              'X-QB-Access-Token': quickBooksStore.getAccessToken() || '',
              'X-QB-Realm-ID': quickBooksStore.getRealmId() || '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
          })
        )
      );

      const results = await Promise.all(
        responses.map(async (response, index) => {
          if (!response.ok) {
            const errorData = await response.json();
            console.warn(`Warning: Failed to fetch ${transactionTypes[index]}:`, errorData);
            return { QueryResponse: { [transactionTypes[index]]: [] } };
          }
          return response.json();
        })
      );

      // Combine all results into a single response
      const combinedResponse = {
        QueryResponse: {
          Transaction: results.flatMap((result, index) => {
            const transactions = result.QueryResponse[transactionTypes[index]] || [];
            return transactions.map((txn: any) => ({
              ...txn,
              TxnType: transactionTypes[index]
            }));
          }).sort((a: any, b: any) => 
            new Date(b.TxnDate).getTime() - new Date(a.TxnDate).getTime()
          )
        }
      };

      return combinedResponse;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async getLists() {
    try {
      // Focus on the most essential list types
      const listTypes = [
        'Account',
        'Customer',
        'Vendor',
        'Item'
      ];
      
      // Process lists sequentially
      const results = [];
      for (const type of listTypes) {
        try {
          const query = `SELECT * FROM ${type}`;
          const response = await fetch('/api/quickbooks/query', {
            method: 'POST',
            headers: {
              'X-QB-Access-Token': quickBooksStore.getAccessToken() || '',
              'X-QB-Realm-ID': quickBooksStore.getRealmId() || '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.warn(`Warning: Failed to fetch ${type}:`, errorData);
            results.push({ [type]: [] });
          } else {
            const data = await response.json();
            results.push({ [type]: data.QueryResponse[type] || [] });
          }
        } catch (error) {
          console.warn(`Error fetching ${type}:`, error);
          results.push({ [type]: [] });
        }
      }

      return {
        QueryResponse: Object.assign({}, ...results)
      };
    } catch (error) {
      console.error('Error fetching lists:', error);
      throw error;
    }
  }

  setRealmId(realmId: string) {
    quickBooksStore.setRealmId(realmId);
  }
} 