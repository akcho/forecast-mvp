import { QuickBooksServerStore } from './serverStore';

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

export class QuickBooksServerClient {
  private store: QuickBooksServerStore;

  constructor(headers: Headers) {
    this.store = new QuickBooksServerStore(headers);
  }

  async getCompanyInfo() {
    const accessToken = this.store.getAccessToken();
    const realmId = this.store.getRealmId();

    if (!accessToken || !realmId) {
      throw new Error('Not authenticated with QuickBooks');
    }

    const response = await fetch('https://sandbox-quickbooks.api.intuit.com/v3/company/' + realmId + '/companyinfo/' + realmId, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'X-QB-Environment': 'sandbox',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch company info');
    }

    return response.json();
  }

  async getBalanceSheet() {
    const accessToken = this.store.getAccessToken();
    const realmId = this.store.getRealmId();

    if (!accessToken || !realmId) {
      throw new Error('Not authenticated with QuickBooks');
    }

    const response = await fetch('https://sandbox-quickbooks.api.intuit.com/v3/company/' + realmId + '/reports/BalanceSheet', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'X-QB-Environment': 'sandbox',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch balance sheet');
    }

    return response.json();
  }

  async getProfitAndLoss() {
    const accessToken = this.store.getAccessToken();
    const realmId = this.store.getRealmId();

    if (!accessToken || !realmId) {
      throw new Error('Not authenticated with QuickBooks');
    }

    const response = await fetch('https://sandbox-quickbooks.api.intuit.com/v3/company/' + realmId + '/reports/ProfitAndLoss', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'X-QB-Environment': 'sandbox',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profit and loss');
    }

    return response.json();
  }

  async getCashFlow() {
    const accessToken = this.store.getAccessToken();
    const realmId = this.store.getRealmId();

    if (!accessToken || !realmId) {
      throw new Error('Not authenticated with QuickBooks');
    }

    const response = await fetch('https://sandbox-quickbooks.api.intuit.com/v3/company/' + realmId + '/reports/CashFlow', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'X-QB-Environment': 'sandbox',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cash flow');
    }

    return response.json();
  }
} 