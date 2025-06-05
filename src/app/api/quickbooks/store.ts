import { cookies } from 'next/headers';

const ACCESS_TOKEN_KEY = 'qb_access_token';
const REFRESH_TOKEN_KEY = 'qb_refresh_token';
const REALM_ID_KEY = 'qb_realm_id';

class QuickBooksServerStore {
  private cookieStore;

  constructor() {
    this.cookieStore = cookies();
  }

  getAccessToken(): string | null {
    return this.cookieStore.get(ACCESS_TOKEN_KEY)?.value || null;
  }

  getRefreshToken(): string | null {
    return this.cookieStore.get(REFRESH_TOKEN_KEY)?.value || null;
  }

  getRealmId(): string | null {
    return this.cookieStore.get(REALM_ID_KEY)?.value || null;
  }
}

export const quickBooksServerStore = new QuickBooksServerStore(); 