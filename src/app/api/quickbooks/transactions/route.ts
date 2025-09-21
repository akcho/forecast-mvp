import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksApiUrl } from '@/lib/quickbooks/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.headers.get('X-QB-Access-Token');
    const realmId = request.headers.get('X-QB-Realm-ID');

    if (!accessToken || !realmId) {
      return NextResponse.json({ 
        error: 'Missing QuickBooks credentials. Please provide X-QB-Access-Token and X-QB-Realm-ID headers.',
        code: 'MISSING_CREDENTIALS'
      }, { status: 400 });
    }

    // Direct API call to QuickBooks for transactions
    const url = `${getQuickBooksApiUrl(realmId, 'items')}?minorversion=65`;
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
    console.error('Error in transactions API route:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 