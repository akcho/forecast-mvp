import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksApiUrl } from '@/lib/quickbooks/config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.headers.get('X-QB-Access-Token');
    const realmId = request.headers.get('X-QB-Realm-ID');

    if (!accessToken || !realmId) {
      return NextResponse.json({ 
        error: 'Missing QuickBooks credentials. Please provide X-QB-Access-Token and X-QB-Realm-ID headers.',
        code: 'MISSING_CREDENTIALS'
      }, { status: 400 });
    }

    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    // URL encode the query to handle special characters
    const encodedQuery = encodeURIComponent(query);
    const url = `${getQuickBooksApiUrl(realmId, 'query')}?query=${encodedQuery}`;

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