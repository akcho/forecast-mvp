/**
 * Server-side QuickBooks client for direct API calls
 * Used within API routes to fetch data directly from QuickBooks
 */

interface QuickBooksReport {
  QueryResponse: {
    Report: {
      Header: {
        Time: string;
        ReportName: string;
        DateMacro: string;
        Currency: string;
        StartPeriod: string;
        EndPeriod: string;
        Option: Array<{
          Name: string;
          Value: string;
        }>;
      };
      Columns: {
        Column: Array<{
          ColTitle: string;
          ColType: string;
          MetaData?: Array<{
            Name: string;
            Value: string;
          }>;
        }>;
      };
      Rows: {
        Row: Array<{
          RowType: string;
          ColData: Array<{
            value: string;
            id?: string;
          }>;
          group?: string;
        }>;
      };
    }[];
  };
}

export class QuickBooksServerAPI {
  private accessToken: string;
  private refreshToken: string;
  private realmId: string;
  private baseUrl: string;

  constructor(accessToken: string, refreshToken: string, realmId: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.realmId = realmId;
    this.baseUrl = 'https://sandbox-quickbooks.api.intuit.com/v3';
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/company/${this.realmId}/${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log(`🔍 QB Server API Request: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ QB API Error: ${response.status} - ${errorText}`);
      throw new Error(`QuickBooks API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ QB API Response for ${endpoint}:`, JSON.stringify(result, null, 2));
    
    // Wrap response in QueryResponse format to match expected structure
    return {
      QueryResponse: {
        Report: result
      }
    };
  }

  async getProfitAndLoss(params: Record<string, string> = {}): Promise<QuickBooksReport> {
    // Default date range if not provided
    if (!params.start_date) {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      params.start_date = startOfYear.toISOString().split('T')[0];
    }
    if (!params.end_date) {
      params.end_date = new Date().toISOString().split('T')[0];
    }

    return this.makeRequest('reports/ProfitAndLoss', params);
  }

  async getBalanceSheet(params: Record<string, string> = {}): Promise<QuickBooksReport> {
    // Default to current date if not provided
    if (!params.date) {
      params.date = new Date().toISOString().split('T')[0];
    }

    return this.makeRequest('reports/BalanceSheet', params);
  }

  async getCashFlow(params: Record<string, string> = {}): Promise<QuickBooksReport> {
    // Default date range if not provided
    if (!params.start_date) {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      params.start_date = startOfYear.toISOString().split('T')[0];
    }
    if (!params.end_date) {
      params.end_date = new Date().toISOString().split('T')[0];
    }

    return this.makeRequest('reports/CashFlow', params);
  }
} 