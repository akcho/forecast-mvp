import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksApiUrl } from '@/lib/quickbooks/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.headers.get('X-QB-Access-Token');
    const realmId = request.headers.get('X-QB-Realm-ID');
    
    if (!accessToken || !realmId) {
      return NextResponse.json({ error: 'Missing QuickBooks credentials. Please provide X-QB-Access-Token and X-QB-Realm-ID headers.' }, { status: 400 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let reportType = '';
    if (type === 'balance-sheet') reportType = 'BalanceSheet';
    else if (type === 'cash-flow') reportType = 'CashFlow';
    else if (type === 'profit-loss') reportType = 'ProfitAndLoss';
    else return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });

    const url = `${getQuickBooksApiUrl(realmId, `reports/${reportType}`)}?minorversion=65`;
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
    
    // Wrap the response in QueryResponse.Report structure to match frontend expectations
    return NextResponse.json({
      QueryResponse: {
        Report: data
      }
    });
  } catch (error) {
    console.error('Error in reports API route:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
} 