import { NextRequest, NextResponse } from 'next/server';
import { getValidSharedConnection } from '@/lib/quickbooks/sharedConnection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let accessToken = request.headers.get('X-QB-Access-Token');
    let realmId = request.headers.get('X-QB-Realm-ID');

    // If no access token is provided, use the shared connection (team member flow)
    if (!accessToken || !realmId) {
      const shared = await getValidSharedConnection();
      accessToken = shared.access_token;
      realmId = shared.realm_id;
    }

    if (!accessToken || !realmId) {
      return NextResponse.json({ error: 'Missing QuickBooks credentials' }, { status: 400 });
    }

    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const summarizeColumnBy = searchParams.get('summarize_column_by');

    // Build the QuickBooks API URL with parameters
    let url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/BalanceSheet?minorversion=65`;
    
    if (startDate) {
      url += `&start_date=${startDate}`;
    }
    if (endDate) {
      url += `&end_date=${endDate}`;
    }
    if (summarizeColumnBy) {
      url += `&summarize_column_by=${summarizeColumnBy}`;
    }

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
    console.error('Error in balance sheet API route:', error);
    return NextResponse.json({ error: 'Failed to fetch balance sheet' }, { status: 500 });
  }
} 