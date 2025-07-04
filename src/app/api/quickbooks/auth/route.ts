import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ACCESS_TOKEN_KEY = 'qb_access_token';
const REFRESH_TOKEN_KEY = 'qb_refresh_token';
const REALM_ID_KEY = 'qb_realm_id';

export async function GET() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_KEY)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_KEY)?.value;
  const realmId = cookieStore.get(REALM_ID_KEY)?.value;

  return NextResponse.json({
    isAuthenticated: !!(accessToken && refreshToken && realmId),
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasRealmId: !!realmId,
  });
} 