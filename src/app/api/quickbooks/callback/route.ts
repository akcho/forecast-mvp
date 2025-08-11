import { NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createCompany } from '@/lib/auth/companies';
import { saveCompanyConnection } from '@/lib/quickbooks/connectionManager';

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  console.log('=== QUICKBOOKS CALLBACK START ===');
  console.log('Callback URL:', request.url);
  console.log('Request method:', request.method);
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');

    console.log('QuickBooks callback parameters:', {
      code: code ? `${code.substring(0, 20)}...` : null,
      state: state ? `${state.substring(0, 20)}...` : null,
      realmId,
      error,
      fullUrl: request.url
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
    console.log('Checking user authentication...');
    const session = await getServerSession(authOptions);
    
    console.log('Session data:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userDbId: session?.user?.dbId,
      userEmail: session?.user?.email,
      sessionExpires: session?.expires
    });
    
    if (!session?.user?.dbId) {
      console.error('=== AUTHENTICATION FAILED ===');
      console.error('No authenticated user found or missing dbId');
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL('/overview?quickbooks=error&error=Not authenticated', baseUrl));
    }

    console.log('✅ User authenticated successfully');
    console.log('Processing new QuickBooks connection for user:', session.user.dbId);

    console.log('Creating QuickBooks client...');
    const client = new QuickBooksClient();
    
    console.log('Exchanging authorization code for tokens...');
    const tokens = await client.exchangeCodeForTokens(code);
    
    console.log('✅ Tokens received from QuickBooks:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      accessTokenLength: tokens.access_token?.length || 0,
      refreshTokenLength: tokens.refresh_token?.length || 0,
      userId: session.user.dbId
    });

    // Fetch company information from QuickBooks
    console.log('Fetching company information...');
    let companyName = `Company ${realmId}`;
    try {
      console.log('Setting temporary tokens in store...');
      // Temporarily set tokens to fetch company info
      const { quickBooksStore } = await import('@/lib/quickbooks/store');
      quickBooksStore.setTokens(tokens.access_token, tokens.refresh_token);
      quickBooksStore.setRealmId(realmId);
      
      console.log('Calling QuickBooks CompanyInfo API...');
      const companyInfo = await client.getCompanyInfo();
      
      console.log('Company info API response:', {
        hasQueryResponse: !!companyInfo?.QueryResponse,
        hasCompanyInfo: !!companyInfo?.QueryResponse?.CompanyInfo,
        companyInfoCount: companyInfo?.QueryResponse?.CompanyInfo?.length || 0,
        companyName: companyInfo?.QueryResponse?.CompanyInfo?.[0]?.CompanyName
      });
      
      if (companyInfo?.QueryResponse?.CompanyInfo?.[0]?.CompanyName) {
        companyName = companyInfo.QueryResponse.CompanyInfo[0].CompanyName;
        console.log('✅ Successfully fetched company name:', companyName);
      } else {
        console.log('⚠️ No company name in response, using default');
      }
    } catch (companyError) {
      console.error('❌ Error fetching company information:');
      console.error('Company error details:', {
        message: companyError instanceof Error ? companyError.message : companyError,
        stack: companyError instanceof Error ? companyError.stack : 'No stack',
        realmId
      });
      console.warn('Using default company name:', companyName);
    }

    // Create or get company and grant admin access to user
    console.log('Creating/getting company record...');
    console.log('Company creation parameters:', {
      realmId,
      companyName,
      adminUserId: session.user.dbId
    });
    
    const company = await createCompany(realmId, companyName, session.user.dbId);
    
    if (!company) {
      console.error('❌ COMPANY CREATION FAILED');
      console.error('createCompany returned null/undefined');
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL('/overview?quickbooks=error&error=Failed to create company', baseUrl));
    }
    
    console.log('✅ Company created/retrieved successfully:', {
      companyId: company.id,
      companyName: company.name,
      quickbooksRealmId: company.quickbooks_realm_id
    });

    // Save company-owned QuickBooks connection
    try {
      console.log('Saving company connection using new connection manager');
      console.log('Connection details:', {
        companyId: company.id,
        realmId,
        companyName,
        userId: session.user.dbId,
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token
      });
      
      await saveCompanyConnection(
        company.id,
        realmId,
        tokens.access_token,
        tokens.refresh_token,
        companyName,
        session.user.dbId // Track who connected for audit
      );
      
      // Redirect to overview with success
      const baseUrl = new URL(request.url).origin;
      const redirectUrl = new URL('/overview', baseUrl);
      redirectUrl.searchParams.set('quickbooks', 'connected');
      redirectUrl.searchParams.set('company_id', company.id);
      
      console.log('✅ QUICKBOOKS OAUTH SUCCESS - REDIRECTING');
      console.log('Redirect URL:', redirectUrl.toString());
      console.log('Final success summary:', {
        userId: session.user.dbId,
        userEmail: session.user.email,
        companyId: company.id,
        companyName: company.name,
        realmId: company.quickbooks_realm_id,
        hasTokens: true
      });
      console.log('=== QUICKBOOKS CALLBACK COMPLETE SUCCESS ===');
      
      return NextResponse.redirect(redirectUrl);
      
    } catch (saveError: any) {
      console.error('Error saving QB connection:', saveError);
      console.error('Save error details:', {
        message: saveError?.message,
        stack: saveError?.stack,
        companyId: company?.id,
        realmId
      });
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL(`/overview?quickbooks=error&error=Failed to save connection: ${encodeURIComponent(saveError?.message || 'Unknown error')}`, baseUrl));
    }
  } catch (error) {
    console.error('QuickBooks callback error:', error);
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(
      new URL(`/overview?quickbooks=error&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, baseUrl)
    );
  }
} 