import { NextRequest, NextResponse } from 'next/server';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let accessToken = request.headers.get('X-QB-Access-Token');
    let realmId = request.headers.get('X-QB-Realm-ID');
    const connectionId = request.headers.get('X-QB-Connection-ID');

    // If no access token is provided, use the connection manager
    if (!accessToken || !realmId) {
      try {
        const connection = await getValidConnection(connectionId ? parseInt(connectionId) : undefined);
        accessToken = connection.access_token;
        realmId = connection.realm_id;
      } catch (error) {
        return NextResponse.json({ 
          error: error instanceof Error ? error.message : 'Failed to get QuickBooks connection',
          code: 'CONNECTION_ERROR'
        }, { status: 401 });
      }
    }

    if (!accessToken || !realmId) {
      return NextResponse.json({ error: 'Missing QuickBooks credentials' }, { status: 400 });
    }

    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // @ts-ignore
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in company API route:', error);
    return NextResponse.json({ error: 'Failed to fetch company info' }, { status: 500 });
  }
} 