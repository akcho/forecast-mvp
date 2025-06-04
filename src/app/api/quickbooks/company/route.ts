import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const accessToken = request.headers.get('X-QB-Access-Token');
    const realmId = request.headers.get('X-QB-Realm-ID');

    if (!accessToken || !realmId) {
      return NextResponse.json({ error: 'Missing access token or realm ID' }, { status: 401 });
    }

    // Use sandbox API endpoint
    const response = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM CompanyInfo&minorversion=65`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QuickBooks API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json({ error: 'Failed to fetch company info' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching company info:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch company info' },
      { status: 500 }
    );
  }
} 