import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('=== DEBUG OAUTH URL ENDPOINT ===');

  try {
    // Create client with current request URL to get production environment detection
    const client = new QuickBooksClient(request.url);

    // Generate the OAuth URL
    const authUrl = client.getAuthorizationUrl();

    // Parse the URL to show all components
    const [baseUrl, queryString] = authUrl.split('?');
    const params = new URLSearchParams(queryString || '');

    const debugInfo = {
      generatedUrl: authUrl,
      baseUrl: baseUrl,
      urlAnalysis: {
        hasExtraApp: authUrl.includes('/app/connect/'),
        shouldBe: 'https://appcenter.intuit.com/connect/oauth2',
        actualBase: baseUrl
      },
      parameters: {
        client_id: params.get('client_id'),
        response_type: params.get('response_type'),
        redirect_uri: params.get('redirect_uri'),
        scope: params.get('scope'),
        state: params.get('state'),
        environment: params.get('environment') || 'not specified (defaults to production)'
      },
      environment_detection: {
        request_hostname: new URL(request.url).hostname,
        env_param: new URL(request.url).searchParams.get('env'),
        detected_environment: new URL(request.url).searchParams.get('env') === 'sandbox' ? 'sandbox' : 'production',
        is_deployed: new URL(request.url).hostname !== 'localhost'
      },
      credential_status: {
        has_production_client_id: !!process.env.PRODUCTION_QB_CLIENT_ID,
        has_production_client_secret: !!process.env.PRODUCTION_QB_CLIENT_SECRET,
        has_sandbox_client_id: !!process.env.QB_CLIENT_ID,
        has_sandbox_client_secret: !!process.env.QB_CLIENT_SECRET,
        has_production_redirect_uri: !!process.env.PRODUCTION_REDIRECT_URI,
        has_development_redirect_uri: !!process.env.DEVELOPMENT_REDIRECT_URI
      }
    };

    return NextResponse.json(debugInfo, { status: 200 });

  } catch (error) {
    console.error('Error generating OAuth URL for debug:', error);
    return NextResponse.json({
      error: 'Failed to generate OAuth URL',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}