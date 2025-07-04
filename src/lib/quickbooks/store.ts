import { cookies } from 'next/headers';

const ACCESS_TOKEN_KEY = 'qb_access_token';
const REFRESH_TOKEN_KEY = 'qb_refresh_token';
const REALM_ID_KEY = 'qb_realm_id';

class QuickBooksStore {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private realmId: string | null = null;
  private isAuthenticated: boolean = false;
  private authCheckPromise: Promise<void> | null = null;

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

      // Start authentication check
      this.authCheckPromise = this.checkAuthentication();
    }
  }

  private async checkAuthentication() {
    try {
      const response = await fetch('/api/quickbooks/status');
      const data = await response.json();
      this.isAuthenticated = data.isAuthenticated;
      console.log('Authentication status:', data);
    } catch (error) {
      console.error('Error checking authentication:', error);
      this.isAuthenticated = false;
    }
  }

  private getCookie(name: string): string | null {
    if (typeof window === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private setCookie(name: string, value: string) {
    if (typeof window === 'undefined') return;
    document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  }

  private deleteCookie(name: string) {
    if (typeof window === 'undefined') return;
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }

  async setTokens(accessToken: string, refreshToken: string) {
    console.log('Setting QuickBooks tokens:', {
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
    });
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.setCookie(ACCESS_TOKEN_KEY, accessToken);
    this.setCookie(REFRESH_TOKEN_KEY, refreshToken);
    console.log('Tokens stored in cookies');
    this.authCheckPromise = this.checkAuthentication();
    await this.authCheckPromise;
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

  async setRealmId(realmId: string) {
    console.log('Setting realm ID:', { realmId });
    this.realmId = realmId;
    this.setCookie(REALM_ID_KEY, realmId);
    console.log('Realm ID stored in cookies');
    this.authCheckPromise = this.checkAuthentication();
    await this.authCheckPromise;
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
    this.isAuthenticated = false;
    this.deleteCookie(ACCESS_TOKEN_KEY);
    this.deleteCookie(REFRESH_TOKEN_KEY);
    this.deleteCookie(REALM_ID_KEY);
    console.log('Store cleared from cookies');
  }

  async isAuthenticatedWithQuickBooks(): Promise<boolean> {
    if (this.authCheckPromise) {
      await this.authCheckPromise;
    }
    return this.isAuthenticated;
  }
}

// Create a single instance for client-side use
export const quickBooksStore = new QuickBooksStore(); 