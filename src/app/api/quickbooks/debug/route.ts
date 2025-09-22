import { NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('=== QUICKBOOKS DEBUG ENDPOINT ===');
    console.log('Request URL:', request.url);

    // Create client to inspect configuration
    const client = new QuickBooksClient(request.url);

    // Get auth URL to see what would be generated
    const authUrl = client.getAuthorizationUrl();

    // Parse the auth URL to see the components
    const url = new URL(authUrl);
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const environment = url.searchParams.get('environment');

    // Environment detection
    const urlObj = new URL(request.url);
    const envParam = urlObj.searchParams.get('env');

    // Check environment variables
    const hasProductionCredentials = !!(process.env.PRODUCTION_QB_CLIENT_ID && process.env.PRODUCTION_QB_CLIENT_SECRET);
    const hasSandboxCredentials = !!(process.env.QB_CLIENT_ID && process.env.QB_CLIENT_SECRET);

    // Deployment detection
    const isDeployed = process.env.VERCEL_URL !== undefined || process.env.NODE_ENV === 'production';

    const debugInfo = {
      timestamp: new Date().toISOString(),
      request: {
        url: request.url,
        envParam,
        detectedEnvironment: envParam === 'sandbox' ? 'sandbox' : 'production'
      },
      deployment: {
        isDeployed,
        nodeEnv: process.env.NODE_ENV,
        hasVercelUrl: !!process.env.VERCEL_URL,
        vercelUrl: process.env.VERCEL_URL || 'not set'
      },
      credentials: {
        hasProductionCredentials,
        hasSandboxCredentials,
        productionClientIdLength: process.env.PRODUCTION_QB_CLIENT_ID?.length || 0,
        sandboxClientIdLength: process.env.QB_CLIENT_ID?.length || 0
      },
      oauthUrl: {
        fullUrl: authUrl,
        clientId: clientId ? `${clientId.substring(0, 10)}...` : 'missing',
        redirectUri,
        environment: environment || 'not specified',
        hasEnvironmentParam: !!environment
      },
      recommendations: []
    };

    // Add recommendations based on findings
    if (!hasProductionCredentials) {
      debugInfo.recommendations.push('MISSING: PRODUCTION_QB_CLIENT_ID and PRODUCTION_QB_CLIENT_SECRET environment variables');
    }

    if (!hasSandboxCredentials) {
      debugInfo.recommendations.push('MISSING: QB_CLIENT_ID and QB_CLIENT_SECRET environment variables');
    }

    if (isDeployed && envParam === 'sandbox' && !hasSandboxCredentials) {
      debugInfo.recommendations.push('ERROR: Trying to use sandbox mode on deployed environment but sandbox credentials are missing');
    }

    if (isDeployed && !envParam && !hasProductionCredentials) {
      debugInfo.recommendations.push('ERROR: Trying to use production mode on deployed environment but production credentials are missing');
    }

    if (redirectUri !== 'https://app.netflo.ai/api/quickbooks/callback' && isDeployed) {
      debugInfo.recommendations.push(`WARNING: Production redirect URI is ${redirectUri}, ensure this is registered in QuickBooks app`);
    }

    return NextResponse.json(debugInfo, { status: 200 });

  } catch (error) {
    console.error('Debug endpoint error:', error);

    return NextResponse.json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}