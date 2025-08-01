import { NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

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
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL(`/analysis?quickbooks=error&error=${encodeURIComponent(error)}`, baseUrl));
    }

    if (!code) {
      console.error('No authorization code received');
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL('/analysis?quickbooks=error&error=No authorization code received', baseUrl));
    }

    const client = new QuickBooksClient();
    const tokens = await client.exchangeCodeForTokens(code);
    
    console.log('Tokens received from QuickBooks:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      accessTokenLength: tokens.access_token?.length,
      refreshTokenLength: tokens.refresh_token?.length,
      accessTokenStart: tokens.access_token?.substring(0, 20),
      refreshTokenStart: tokens.refresh_token?.substring(0, 20),
    });

    // Save connection to database using server-side approach
    try {
      const supabase = getSupabaseClient();
      
      // For now, use a generic user ID that will be replaced by the client
      // The client will update this when it processes the connection
      const tempUserId = 'temp_user_' + Date.now();
      const companyId = 'default_company';
      
      console.log('Saving connection with temp user ID:', { tempUserId, companyId, realmId });
      
      const { data: connection, error: saveError } = await supabase
        .from('quickbooks_connections')
        .insert({
          user_id: tempUserId,
          company_id: companyId,
          realm_id: realmId || '',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          company_name: undefined, // Will be fetched later
          is_active: true,
          is_shared: false,
          updated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving connection:', saveError);
        throw saveError;
      }
      
      console.log('Connection saved to database:', {
        connectionId: connection.id,
        realmId: connection.realm_id,
        tempUserId: connection.user_id
      });
      
      // Redirect with connection ID instead of tokens
      const baseUrl = new URL(request.url).origin;
      const redirectUrl = new URL('/analysis', baseUrl);
      redirectUrl.searchParams.set('quickbooks', 'connected');
      redirectUrl.searchParams.set('connection_id', connection.id.toString());
      
      console.log('Redirecting to analysis page with connection ID');
      console.log('Request URL:', request.url);
      console.log('Base URL:', baseUrl);
      console.log('Redirect URL:', redirectUrl.toString());
      // Set a cookie for the temp user ID so the client can migrate it
      const response = NextResponse.redirect(redirectUrl);
      response.headers.append('Set-Cookie', `qb_temp_user_id=${tempUserId}; Path=/; Max-Age=600; SameSite=Lax`);
      return response;
    } catch (saveError) {
      console.error('Error saving connection:', saveError);
      // Fallback to old method if saving fails
      const baseUrl = new URL(request.url).origin;
      const redirectUrl = new URL('/analysis', baseUrl);
      redirectUrl.searchParams.set('quickbooks', 'connected');
      redirectUrl.searchParams.set('access_token', tokens.access_token);
      redirectUrl.searchParams.set('refresh_token', tokens.refresh_token);
      if (realmId) {
        redirectUrl.searchParams.set('realm_id', realmId);
      }
      
      console.log('Redirecting to analysis page with tokens (fallback)');
      console.log('Fallback redirect URL:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('QuickBooks callback error:', error);
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(
      new URL(`/analysis?quickbooks=error&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, baseUrl)
    );
  }
} 