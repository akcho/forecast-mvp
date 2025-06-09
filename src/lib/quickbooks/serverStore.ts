import { headers } from 'next/headers';

const ACCESS_TOKEN_KEY = 'X-QB-Access-Token';
const REFRESH_TOKEN_KEY = 'X-QB-Refresh-Token';
const REALM_ID_KEY = 'X-QB-Realm-ID';

class QuickBooksServerStore {
  private headers: Headers;

  constructor(headers: Headers) {
    this.headers = headers;
  }

  getAccessToken(): string | null {
    return this.headers.get(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.headers.get(REFRESH_TOKEN_KEY);
  }

  getRealmId(): string | null {
    return this.headers.get(REALM_ID_KEY);
  }

  async isAuthenticatedWithQuickBooks(): Promise<boolean> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const realmId = this.getRealmId();

    if (!accessToken || !refreshToken || !realmId) {
      return false;
    }

    try {
      const response = await fetch('https://sandbox-quickbooks.api.intuit.com/v3/company/' + realmId + '/companyinfo/' + realmId, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-QB-Environment': 'sandbox',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error checking QuickBooks authentication:', error);
      return false;
    }
  }
}

export { QuickBooksServerStore }; 