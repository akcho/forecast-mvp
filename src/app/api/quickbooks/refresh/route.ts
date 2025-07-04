import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const refreshToken = request.headers.get('X-QB-Refresh-Token');
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 });
    }

    const clientId = process.env.QB_CLIENT_ID;
    const clientSecret = process.env.QB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('QuickBooks credentials not configured');
      return NextResponse.json({ error: 'QuickBooks credentials not configured' }, { status: 500 });
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken,
        'environment': 'sandbox'
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
  } catch (error) {
    console.error('QuickBooks refresh error:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
      } : error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh token' },
      { status: 500 }
    );
  }
} 