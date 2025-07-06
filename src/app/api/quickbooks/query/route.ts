import { NextRequest, NextResponse } from 'next/server';
import { getValidSharedConnection } from '@/lib/quickbooks/sharedConnection';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let accessToken = request.headers.get('X-QB-Access-Token');
    let realmId = request.headers.get('X-QB-Realm-ID');
    const { query } = await request.json();

    // If no access token is provided, use the shared connection (team member flow)
    if (!accessToken || !realmId) {
      const shared = await getValidSharedConnection();
      accessToken = shared.access_token;
      realmId = shared.realm_id;
    }

    if (!accessToken || !realmId) {
      return NextResponse.json(
        { error: 'Missing authentication headers' },
        { status: 401 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    // URL encode the query to handle special characters
    const encodedQuery = encodeURIComponent(query);
    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodedQuery}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // @ts-ignore - Next.js types don't include this property
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QuickBooks query error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        { error: `QuickBooks API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in QuickBooks query:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 