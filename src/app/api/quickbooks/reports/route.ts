import { NextRequest, NextResponse } from 'next/server';
import { getValidSharedConnection } from '@/lib/quickbooks/sharedConnection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let accessToken = request.headers.get('X-QB-Access-Token');
    let realmId = request.headers.get('X-QB-Realm-ID');
    const type = request.nextUrl.searchParams.get('type');

    // If no access token is provided, use the shared connection (team member flow)
    if (!accessToken || !realmId) {
      const shared = await getValidSharedConnection();
      accessToken = shared.access_token;
      realmId = shared.realm_id;
    }

    if (!accessToken || !realmId) {
      return NextResponse.json({ error: 'Missing QuickBooks credentials' }, { status: 400 });
    }

    let reportType = '';
    if (type === 'balance-sheet') reportType = 'BalanceSheet';
    else if (type === 'cash-flow') reportType = 'CashFlow';
    else if (type === 'profit-loss') reportType = 'ProfitAndLoss';
    else return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });

    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/${reportType}?minorversion=65`;
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