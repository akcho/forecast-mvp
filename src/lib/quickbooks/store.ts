import { cookies } from 'next/headers';

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
      // Initialize from cookies in browser
      this.accessToken = this.getCookie(ACCESS_TOKEN_KEY);
      this.refreshToken = this.getCookie(REFRESH_TOKEN_KEY);
      this.realmId = this.getCookie(REALM_ID_KEY);

      console.log('QuickBooksStore initialized from cookies:', {
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

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private setCookie(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  }

  private deleteCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }

  setTokens(accessToken: string, refreshToken: string) {
    console.log('Setting QuickBooks tokens:', {
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
    });
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    if (typeof window !== 'undefined') {
      this.setCookie(ACCESS_TOKEN_KEY, accessToken);
      this.setCookie(REFRESH_TOKEN_KEY, refreshToken);
      console.log('Tokens stored in cookies');
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
      this.setCookie(REALM_ID_KEY, realmId);
      console.log('Realm ID stored in cookies');
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
      this.deleteCookie(ACCESS_TOKEN_KEY);
      this.deleteCookie(REFRESH_TOKEN_KEY);
      this.deleteCookie(REALM_ID_KEY);
      console.log('Store cleared from cookies');
    }
  }
}

// Create separate instances for client and server
export const quickBooksStore = typeof window !== 'undefined' 
  ? new QuickBooksStore()  // Client-side instance
  : {
      // Server-side instance with no-op methods
      getAccessToken: () => null,
      getRefreshToken: () => null,
      getRealmId: () => null,
      setTokens: () => {},
      setRealmId: () => {},
      clear: () => {},
    }; 