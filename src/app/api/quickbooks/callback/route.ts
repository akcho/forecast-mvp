import { NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');

    console.log('QuickBooks callback received:', {
      hasCode: !!code,
      hasState: !!state,
      hasRealmId: !!realmId,
      error,
    });

    if (error) {
      console.error('QuickBooks authorization error:', error);
      return NextResponse.redirect(new URL(`/?quickbooks=error&error=${encodeURIComponent(error)}`, request.url));
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(new URL('/?quickbooks=error&error=No authorization code received', request.url));
    }

    const client = new QuickBooksClient();
    const tokens = await client.exchangeCodeForTokens(code);
    
    console.log('Tokens received from QuickBooks:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
    });

    // Store tokens in localStorage via URL parameters
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('quickbooks', 'connected');
    redirectUrl.searchParams.set('access_token', tokens.access_token);
    redirectUrl.searchParams.set('refresh_token', tokens.refresh_token);
    if (realmId) {
      redirectUrl.searchParams.set('realm_id', realmId);
    }

    console.log('Redirecting to dashboard with tokens');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('QuickBooks callback error:', error);
    return NextResponse.redirect(
      new URL(`/?quickbooks=error&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url)
    );
  }
} 