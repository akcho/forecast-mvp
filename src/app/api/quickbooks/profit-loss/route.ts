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

    // Forward the request to the reports endpoint, preserving search params
    const reportsUrl = new URL(`${request.nextUrl.origin}/api/quickbooks/reports`);
    request.nextUrl.searchParams.forEach((value, key) => {
      reportsUrl.searchParams.append(key, value);
    });
    reportsUrl.searchParams.set('type', 'profit-loss');

    const response = await fetch(reportsUrl.toString(), {
      headers: {
        'X-QB-Access-Token': accessToken,
        'X-QB-Realm-ID': realmId,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching profit and loss:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profit and loss' },
      { status: 500 }
    );
  }
} 