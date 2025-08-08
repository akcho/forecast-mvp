import { NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createCompany } from '@/lib/auth/companies';

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
      return NextResponse.redirect(new URL(`/overview?quickbooks=error&error=${encodeURIComponent(error)}`, baseUrl));
    }

    if (!code || !realmId) {
      console.error('Missing required parameters');
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL('/overview?quickbooks=error&error=Missing required parameters', baseUrl));
    }

    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      console.error('User not authenticated');
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL('/auth/signin', baseUrl));
    }

    const client = new QuickBooksClient();
    const tokens = await client.exchangeCodeForTokens(code);
    
    console.log('Tokens received from QuickBooks:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      userId: session.user.dbId
    });

    // Fetch company information from QuickBooks
    let companyName = `Company ${realmId}`;
    try {
      // Temporarily set tokens to fetch company info
      const { quickBooksStore } = await import('@/lib/quickbooks/store');
      quickBooksStore.setTokens(tokens.access_token, tokens.refresh_token);
      quickBooksStore.setRealmId(realmId);
      
      const companyInfo = await client.getCompanyInfo();
      if (companyInfo?.QueryResponse?.CompanyInfo?.[0]?.CompanyName) {
        companyName = companyInfo.QueryResponse.CompanyInfo[0].CompanyName;
      }
      console.log('Fetched company name:', companyName);
    } catch (companyError) {
      console.warn('Could not fetch company name, using default:', companyError);
    }

    // Create or get company and grant admin access to user
    const company = await createCompany(realmId, companyName, session.user.dbId);
    if (!company) {
      console.error('Failed to create/get company');
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL('/overview?quickbooks=error&error=Failed to create company', baseUrl));
    }

    // Save or update QuickBooks connection
    try {
      const supabase = getSupabaseClient();
      
      // Check if a connection already exists for this company
      const { data: existingConnection, error: checkError } = await supabase
        .from('quickbooks_connections')
        .select('*')
        .eq('company_id', company.id)
        .eq('realm_id', realmId)
        .eq('is_active', true)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking for existing connection:', checkError);
      }
      
      if (existingConnection) {
        // Update existing connection with fresh tokens
        console.log('Updating existing QB connection for company:', company.id);
        
        const { error: updateError } = await supabase
          .from('quickbooks_connections')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            company_name: companyName,
            updated_at: new Date().toISOString(),
            last_used_at: new Date().toISOString()
          })
          .eq('id', existingConnection.id);
        
        if (updateError) {
          console.error('Error updating QB connection:', updateError);
          throw updateError;
        }
        
        console.log('Updated existing QB connection successfully');
        
      } else {
        // Create new QuickBooks connection
        console.log('Creating new QB connection for company:', company.id);
        
        const { error: insertError } = await supabase
          .from('quickbooks_connections')
          .insert({
            user_id: session.user.dbId, // Connect to the actual authenticated user
            company_id: company.id,
            realm_id: realmId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            company_name: companyName,
            is_active: true,
            updated_at: new Date().toISOString(),
            last_used_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('Error creating QB connection:', insertError);
          throw insertError;
        }
        
        console.log('Created new QB connection successfully');
      }
      
      // Redirect to overview with success
      const baseUrl = new URL(request.url).origin;
      const redirectUrl = new URL('/overview', baseUrl);
      redirectUrl.searchParams.set('quickbooks', 'connected');
      redirectUrl.searchParams.set('company_id', company.id);
      
      console.log('Redirecting to overview page:', redirectUrl.toString());
      return NextResponse.redirect(redirectUrl);
      
    } catch (saveError) {
      console.error('Error saving QB connection:', saveError);
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL('/overview?quickbooks=error&error=Failed to save connection', baseUrl));
    }
  } catch (error) {
    console.error('QuickBooks callback error:', error);
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(
      new URL(`/overview?quickbooks=error&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, baseUrl)
    );
  }
} 