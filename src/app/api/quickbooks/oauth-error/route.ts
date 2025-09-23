import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OAuth Error Capture Route
 *
 * This route captures detailed OAuth error information when Intuit's OAuth flow fails.
 * It provides comprehensive debugging data for production troubleshooting.
 */
export async function GET(request: NextRequest) {
  console.log('=== QUICKBOOKS OAUTH ERROR CAPTURE START ===');
  console.log('Error capture timestamp:', new Date().toISOString());
  console.log('Request URL:', request.url);

  try {
    const { searchParams } = new URL(request.url);

    // Capture all query parameters from the error redirect
    const allParams = Object.fromEntries(searchParams.entries());

    console.log('=== OAUTH ERROR PARAMETERS ===');
    console.log('All error parameters:', allParams);

    // Extract common OAuth error parameters
    const errorDetails = {
      error: searchParams.get('error'),
      error_description: searchParams.get('error_description'),
      error_uri: searchParams.get('error_uri'),
      state: searchParams.get('state'),
      client_id: searchParams.get('client_id'),
      redirect_uri: searchParams.get('redirect_uri'),
      scope: searchParams.get('scope'),
      response_type: searchParams.get('response_type'),
      environment: searchParams.get('environment')
    };

    console.log('=== STRUCTURED ERROR ANALYSIS ===');
    console.log('OAuth error details:', errorDetails);

    // Analyze the error type
    console.log('=== ERROR TYPE ANALYSIS ===');
    const errorType = errorDetails.error;
    const errorDescription = errorDetails.error_description;

    console.log('Error classification:', {
      errorCode: errorType,
      description: errorDescription,
      isRedirectUriError: errorDescription?.toLowerCase().includes('redirect_uri'),
      isClientIdError: errorDescription?.toLowerCase().includes('client_id'),
      isInvalidRequest: errorType === 'invalid_request',
      isUnauthorizedClient: errorType === 'unauthorized_client',
      isAccessDenied: errorType === 'access_denied'
    });

    // Analyze state parameter for environment detection
    console.log('=== STATE PARAMETER ANALYSIS ===');
    const state = errorDetails.state;
    let detectedEnvironment = null;
    if (state) {
      const stateParts = state.split('_');
      if (stateParts.length >= 2 && (stateParts[0] === 'sandbox' || stateParts[0] === 'production')) {
        detectedEnvironment = stateParts[0];
      }
    }

    console.log('State analysis:', {
      rawState: state,
      detectedEnvironment: detectedEnvironment || 'could not detect',
      stateFormat: state ? 'present' : 'missing'
    });

    // Validate redirect URI format
    console.log('=== REDIRECT URI ANALYSIS ===');
    const redirectUri = errorDetails.redirect_uri;
    if (redirectUri) {
      try {
        const parsedUri = new URL(redirectUri);
        console.log('Redirect URI validation:', {
          redirectUri: redirectUri,
          protocol: parsedUri.protocol,
          hostname: parsedUri.hostname,
          pathname: parsedUri.pathname,
          isHttps: parsedUri.protocol === 'https:',
          isLocalhost: parsedUri.hostname === 'localhost',
          isValidFormat: true
        });
      } catch (uriError) {
        console.error('Invalid redirect URI format:', {
          redirectUri: redirectUri,
          parseError: uriError instanceof Error ? uriError.message : 'Unknown error',
          isValidFormat: false
        });
      }
    } else {
      console.log('No redirect URI in error parameters');
    }

    // Production environment context
    console.log('=== PRODUCTION CONTEXT ===');
    console.log('Environment context:', {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      origin: request.headers.get('origin'),
      host: request.headers.get('host'),
      vercelEnv: process.env.VERCEL_ENV,
      nodeEnv: process.env.NODE_ENV
    });

    // Generate structured error response
    const errorResponse = {
      timestamp: new Date().toISOString(),
      error: errorType,
      description: errorDescription,
      detectedEnvironment,
      redirectUri,
      clientId: errorDetails.client_id,
      requestContext: {
        host: request.headers.get('host'),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer')
      },
      troubleshooting: {
        possibleCauses: [],
        recommendations: []
      }
    };

    // Add troubleshooting insights based on error type
    if (errorDescription?.toLowerCase().includes('redirect_uri')) {
      errorResponse.troubleshooting.possibleCauses.push('Redirect URI mismatch in QuickBooks app configuration');
      errorResponse.troubleshooting.recommendations.push('Verify redirect URI in QuickBooks Developer Dashboard');
    }

    if (errorDescription?.toLowerCase().includes('client_id')) {
      errorResponse.troubleshooting.possibleCauses.push('Invalid or incorrect client ID');
      errorResponse.troubleshooting.recommendations.push('Check PRODUCTION_QB_CLIENT_ID environment variable');
    }

    if (errorType === 'access_denied') {
      errorResponse.troubleshooting.possibleCauses.push('User denied authorization or canceled OAuth flow');
      errorResponse.troubleshooting.recommendations.push('User action - retry OAuth flow if needed');
    }

    console.log('=== FINAL ERROR SUMMARY ===');
    console.log('Error summary for production debugging:', errorResponse);
    console.log('=== QUICKBOOKS OAUTH ERROR CAPTURE COMPLETE ===');

    // Redirect back to forecast page with error details
    const baseUrl = new URL(request.url).origin;
    const redirectUrl = new URL('/forecast', baseUrl);
    redirectUrl.searchParams.set('quickbooks', 'oauth_error');
    redirectUrl.searchParams.set('error_type', errorType || 'unknown');
    redirectUrl.searchParams.set('error_detail', errorDescription || 'OAuth authorization failed');

    // Preserve environment if detected
    if (detectedEnvironment) {
      redirectUrl.searchParams.set('env', detectedEnvironment);
    }

    return NextResponse.redirect(redirectUrl);

  } catch (processingError) {
    console.error('=== ERROR PROCESSING OAUTH ERROR ===');
    console.error('Error while processing OAuth error:', processingError);
    console.error('Processing error details:', {
      message: processingError instanceof Error ? processingError.message : 'Unknown error',
      stack: processingError instanceof Error ? processingError.stack : 'No stack'
    });

    // Fallback redirect
    const baseUrl = new URL(request.url).origin;
    const fallbackUrl = new URL('/forecast', baseUrl);
    fallbackUrl.searchParams.set('quickbooks', 'error');
    fallbackUrl.searchParams.set('error', 'OAuth error processing failed');

    return NextResponse.redirect(fallbackUrl);
  }
}