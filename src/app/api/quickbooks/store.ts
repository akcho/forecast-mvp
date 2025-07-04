import { cookies } from 'next/headers';

const ACCESS_TOKEN_KEY = 'qb_access_token';
const REFRESH_TOKEN_KEY = 'qb_refresh_token';
const REALM_ID_KEY = 'qb_realm_id';

class QuickBooksServerStore {
  getAccessToken(): string | null {
    const cookieStore = cookies();
    return cookieStore.get(ACCESS_TOKEN_KEY)?.value || null;
  }

  getRefreshToken(): string | null {
    const cookieStore = cookies();
    return cookieStore.get(REFRESH_TOKEN_KEY)?.value || null;
  }

  getRealmId(): string | null {
    const cookieStore = cookies();
    return cookieStore.get(REALM_ID_KEY)?.value || null;
  }
}

export const quickBooksServerStore = new QuickBooksServerStore(); 