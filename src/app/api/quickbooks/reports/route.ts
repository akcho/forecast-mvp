import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const accessToken = request.headers.get('X-QB-Access-Token');
    const realmId = request.headers.get('X-QB-Realm-ID');
    const reportType = new URL(request.url).searchParams.get('type');

    console.log('Reports request received:', {
      hasAccessToken: !!accessToken,
      hasRealmId: !!realmId,
      reportType,
    });

    if (!accessToken || !realmId) {
      console.error('Missing credentials:', { hasAccessToken: !!accessToken, hasRealmId: !!realmId });
      return NextResponse.json({ error: 'Missing access token or realm ID' }, { status: 401 });
    }

    if (!reportType) {
      console.error('Missing report type');
      return NextResponse.json({ error: 'Report type is required' }, { status: 400 });
    }

    // Map the report type to QuickBooks API format
    let endpoint;
    switch (reportType) {
      case 'balance-sheet':
        endpoint = 'BalanceSheet';
        break;
      case 'profit-loss':
        endpoint = 'ProfitAndLoss';
        break;
      case 'cash-flow':
        endpoint = 'CashFlow';
        break;
      default:
        console.error('Invalid report type:', reportType);
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    console.log('Fetching report from QuickBooks:', {
      endpoint,
      realmId,
      hasAccessToken: !!accessToken,
    });

    // Use sandbox API endpoint
    const response = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/${endpoint}?minorversion=65`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-QB-Environment': 'sandbox',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QuickBooks API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        endpoint,
        realmId,
      });
      return NextResponse.json({ 
        error: 'Failed to fetch report',
        details: errorText,
        status: response.status,
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('Report data received:', {
      endpoint,
      hasData: !!data,
      rowCount: data?.Rows?.Row?.length || 0,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch report',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
} 