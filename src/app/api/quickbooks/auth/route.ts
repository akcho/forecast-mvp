import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('=== QUICKBOOKS AUTH ROUTE START ===');
  console.log('Request URL:', request.url);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  console.log('Request method:', request.method);

  // Enhanced production debugging context
  console.log('=== DEPLOYMENT CONTEXT ===');
  console.log('Environment variables status:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL ? 'set' : 'not set',
    VERCEL_ENV: process.env.VERCEL_ENV,
    hasProductionClientId: !!process.env.PRODUCTION_QB_CLIENT_ID,
    hasProductionClientSecret: !!process.env.PRODUCTION_QB_CLIENT_SECRET,
    hasSandboxClientId: !!process.env.QB_CLIENT_ID,
    hasSandboxClientSecret: !!process.env.QB_CLIENT_SECRET,
    hasProductionRedirectUri: !!process.env.PRODUCTION_REDIRECT_URI,
    hasDevelopmentRedirectUri: !!process.env.DEVELOPMENT_REDIRECT_URI,
  });

  // Parse request URL for environment detection
  const requestUrl = new URL(request.url);
  const envParam = requestUrl.searchParams.get('env');
  console.log('URL environment detection:', {
    hostname: requestUrl.hostname,
    envParam: envParam || 'not specified',
    detectedEnvironment: envParam === 'sandbox' ? 'sandbox' : 'production',
    isLocalhost: requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1',
    isDeployed: requestUrl.hostname !== 'localhost' && requestUrl.hostname !== '127.0.0.1'
  });

  try {
    console.log('Creating QuickBooks client...');
    // Pass request URL to client for environment detection
    const client = new QuickBooksClient(request.url);

    console.log('Generating authorization URL...');
    const authUrl = client.getAuthorizationUrl();

    console.log('Generated authorization URL:', authUrl);

    // Enhanced OAuth URL analysis
    const [baseUrl, queryString] = authUrl.split('?');
    const params = new URLSearchParams(queryString || '');
    console.log('=== OAUTH URL ANALYSIS ===');
    console.log('Base URL:', baseUrl);
    console.log('OAuth Parameters:', {
      client_id: params.get('client_id'),
      response_type: params.get('response_type'),
      redirect_uri: params.get('redirect_uri'),
      scope: params.get('scope'),
      state: params.get('state'),
      environment: params.get('environment') || 'not specified'
    });

    // Validate critical OAuth parameters
    const clientId = params.get('client_id');
    const redirectUri = params.get('redirect_uri');
    const state = params.get('state');

    console.log('=== OAUTH PARAMETER VALIDATION ===');
    console.log('Client ID validation:', {
      hasClientId: !!clientId,
      clientIdLength: clientId?.length || 0,
      clientIdPrefix: clientId?.substring(0, 10) + '...',
      isValidFormat: clientId ? /^[A-Za-z0-9]+$/.test(clientId) : false
    });

    console.log('Redirect URI validation:', {
      hasRedirectUri: !!redirectUri,
      redirectUri: redirectUri,
      isHttps: redirectUri?.startsWith('https://'),
      domain: redirectUri ? new URL(redirectUri).hostname : 'invalid',
      path: redirectUri ? new URL(redirectUri).pathname : 'invalid'
    });

    console.log('State parameter validation:', {
      hasState: !!state,
      stateLength: state?.length || 0,
      stateFormat: state,
      containsEnvironment: state?.includes('sandbox') || state?.includes('production')
    });

    // Log any potential issues
    const issues = [];
    if (!clientId) issues.push('Missing client_id parameter');
    if (!redirectUri) issues.push('Missing redirect_uri parameter');
    if (!state) issues.push('Missing state parameter');
    if (redirectUri && !redirectUri.startsWith('https://') && !redirectUri.startsWith('http://localhost')) {
      issues.push('Redirect URI must be HTTPS (unless localhost)');
    }

    if (issues.length > 0) {
      console.error('=== OAUTH VALIDATION ISSUES ===');
      issues.forEach(issue => console.error('❌', issue));
    } else {
      console.log('✅ All OAuth parameters validated successfully');
    }

    // Redirect the user to Intuit's OAuth authorization page
    console.log('Redirecting user to QuickBooks OAuth...');
    return NextResponse.redirect(authUrl);
    
  } catch (error) {
    console.error('=== QUICKBOOKS AUTH ERROR ===');
    console.error('Error initiating QuickBooks OAuth:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    // Redirect back to the app with an error
    const baseUrl = request.nextUrl.origin;
    const errorUrl = new URL(`/?quickbooks=error&error=${encodeURIComponent('Failed to initiate QuickBooks connection')}`, baseUrl);
    
    console.log('Redirecting to error page:', errorUrl.toString());
    return NextResponse.redirect(errorUrl);
  }
} 