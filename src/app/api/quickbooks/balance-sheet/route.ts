import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.headers.get('X-QB-Access-Token');
    const realmId = request.headers.get('X-QB-Realm-ID');

    if (!accessToken || !realmId) {
      return NextResponse.json(
        { error: 'Missing access token or realm ID' },
        { status: 401 }
      );
    }

    // Forward the request to the reports endpoint
    const response = await fetch(
      `${request.nextUrl.origin}/api/quickbooks/reports?type=balance-sheet`,
      {
        headers: {
          'X-QB-Access-Token': accessToken,
          'X-QB-Realm-ID': realmId,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance sheet' },
      { status: 500 }
    );
  }
} 