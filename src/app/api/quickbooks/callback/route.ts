import { NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createCompany } from '@/lib/auth/companies';
import { saveCompanyConnection } from '@/lib/quickbooks/connectionManager';
import { getQuickBooksApiUrl, getEnvironmentFromState, getQuickBooksApiUrlForEnvironment } from '@/lib/quickbooks/config';

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

    // Extract environment from state parameter
    const oauthEnvironment = getEnvironmentFromState(state || '');

    console.log('QuickBooks callback parameters:', {
      code: code ? `${code.substring(0, 20)}...` : null,
      state: state ? `${state.substring(0, 20)}...` : null,
      realmId,
      error,
      oauthEnvironment: oauthEnvironment || 'not found in state',
      fullUrl: request.url
    });

    if (error) {
      console.error('QuickBooks authorization error:', error);
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL(`/forecast?quickbooks=error&error=${encodeURIComponent(error)}`, baseUrl));
    }

    if (!code || !realmId) {
      console.error('Missing required parameters');
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(new URL('/forecast?quickbooks=error&error=Missing required parameters', baseUrl));
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
      return NextResponse.redirect(new URL('/forecast?quickbooks=error&error=Not authenticated', baseUrl));
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

    // Fetch company information directly from QuickBooks API
    console.log('=== COMPANY NAME FETCH START ===');
    console.log('Fetching company information for realm:', realmId);
    let companyName = `Company ${realmId}`;
    console.log('Default fallback name set to:', companyName);
    
    try {
      console.log('Making direct QuickBooks CompanyInfo API call...');
      // Use environment from OAuth state parameter instead of current server environment
      const companyInfoUrl = oauthEnvironment
        ? `${getQuickBooksApiUrlForEnvironment(realmId, `companyinfo/${realmId}`, oauthEnvironment)}?minorversion=65`
        : `${getQuickBooksApiUrl(realmId, `companyinfo/${realmId}`)}?minorversion=65`;
      console.log('API URL:', companyInfoUrl);
      console.log('Using OAuth environment:', oauthEnvironment || 'fallback to current server environment');
      console.log('Access token length:', tokens.access_token?.length || 0);
      console.log('Access token first 20 chars:', tokens.access_token?.substring(0, 20) + '...');
      
      const requestHeaders = {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      console.log('Request headers:', {
        Authorization: requestHeaders.Authorization?.substring(0, 20) + '...',
        Accept: requestHeaders.Accept,
        'Content-Type': requestHeaders['Content-Type']
      });
      
      console.log('Sending fetch request to QuickBooks...');
      const companyResponse = await fetch(companyInfoUrl, {
        headers: requestHeaders,
      });

      console.log('QuickBooks API response received:', {
        ok: companyResponse.ok,
        status: companyResponse.status,
        statusText: companyResponse.statusText,
        headers: Object.fromEntries(companyResponse.headers.entries())
      });

      if (companyResponse.ok) {
        console.log('Response OK - parsing JSON...');
        const companyData = await companyResponse.json();
        console.log('=== FULL COMPANY DATA RESPONSE ===');
        console.log(JSON.stringify(companyData, null, 2));
        console.log('=== END FULL RESPONSE ===');
        
        console.log('Company info API response analysis:', {
          hasCompanyInfo: !!companyData?.CompanyInfo,
          companyName: companyData?.CompanyInfo?.CompanyName,
          fullCompanyInfo: companyData?.CompanyInfo || 'No company info'
        });
        
        if (companyData?.CompanyInfo?.CompanyName) {
          const fetchedName = companyData.CompanyInfo.CompanyName;
          console.log('✅ COMPANY NAME FOUND:', fetchedName);
          console.log('Changing company name from:', companyName);
          companyName = fetchedName;
          console.log('Changed company name to:', companyName);
        } else {
          console.log('⚠️ NO COMPANY NAME IN RESPONSE STRUCTURE');
          console.log('Available keys in CompanyInfo:', 
            companyData?.CompanyInfo ? 
            Object.keys(companyData.CompanyInfo) : 'No CompanyInfo');
        }
      } else {
        console.error('❌ QuickBooks API request failed');
        const errorText = await companyResponse.text();
        console.error('Error response details:', {
          status: companyResponse.status,
          statusText: companyResponse.statusText,
          responseHeaders: Object.fromEntries(companyResponse.headers.entries()),
          responseBody: errorText
        });
      }
    } catch (companyError) {
      console.error('❌ EXCEPTION during company name fetch:');
      console.error('Exception details:', {
        name: companyError instanceof Error ? companyError.name : 'Unknown',
        message: companyError instanceof Error ? companyError.message : companyError,
        stack: companyError instanceof Error ? companyError.stack : 'No stack',
        realmId,
        tokenLength: tokens.access_token?.length || 0
      });
    }
    
    console.log('=== COMPANY NAME FETCH COMPLETE ===');
    console.log('Final company name to be used:', companyName);
    console.log('Is it still the default?', companyName === `Company ${realmId}`);
    console.log('=== END COMPANY NAME SECTION ===');

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
      return NextResponse.redirect(new URL('/forecast?quickbooks=error&error=Failed to create company', baseUrl));
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
      
      // Redirect to forecast with success
      const baseUrl = new URL(request.url).origin;
      const redirectUrl = new URL('/forecast', baseUrl);
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
      return NextResponse.redirect(new URL(`/forecast?quickbooks=error&error=Failed to save connection: ${encodeURIComponent(saveError?.message || 'Unknown error')}`, baseUrl));
    }
  } catch (error) {
    console.error('QuickBooks callback error:', error);
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(
      new URL(`/forecast?quickbooks=error&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, baseUrl)
    );
  }
} 