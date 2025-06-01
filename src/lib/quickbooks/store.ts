const ACCESS_TOKEN_KEY = 'qb_access_token';
const REFRESH_TOKEN_KEY = 'qb_refresh_token';
const REALM_ID_KEY = 'qb_realm_id';

class QuickBooksStore {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private realmId: string | null = null;

  constructor() {
    console.log('Initializing QuickBooks store');
    if (typeof window !== 'undefined') {
      // Initialize from localStorage
      this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      this.realmId = localStorage.getItem(REALM_ID_KEY);

      console.log('QuickBooksStore initialized from localStorage:', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken,
        hasRealmId: !!this.realmId,
        accessTokenLength: this.accessToken?.length,
        refreshTokenLength: this.refreshToken?.length,
      });
    } else {
      console.log('QuickBooksStore initialized in server environment');
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    console.log('Setting QuickBooks tokens:', {
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
    });
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      console.log('Tokens stored in localStorage');
    }
  }

  getAccessToken(): string | null {
    console.log('Getting access token:', { 
      hasToken: !!this.accessToken,
      tokenLength: this.accessToken?.length,
    });
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    console.log('Getting refresh token:', { 
      hasToken: !!this.refreshToken,
      tokenLength: this.refreshToken?.length,
    });
    return this.refreshToken;
  }

  setRealmId(realmId: string) {
    console.log('Setting realm ID:', { realmId });
    this.realmId = realmId;
    if (typeof window !== 'undefined') {
      localStorage.setItem(REALM_ID_KEY, realmId);
      console.log('Realm ID stored in localStorage');
    }
  }

  getRealmId(): string | null {
    console.log('Getting realm ID:', { 
      hasRealmId: !!this.realmId,
      realmId: this.realmId,
    });
    return this.realmId;
  }

  clear() {
    console.log('Clearing QuickBooks store');
    this.accessToken = null;
    this.refreshToken = null;
    this.realmId = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(REALM_ID_KEY);
      console.log('Store cleared from localStorage');
    }
  }
}

export const quickBooksStore = new QuickBooksStore(); 