import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const accessToken = request.headers.get('X-QB-Access-Token');
    const realmId = request.headers.get('X-QB-Realm-ID');
    const url = new URL(request.url);
    const reportType = url.searchParams.get('type');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const columns = url.searchParams.get('columns');

    console.log('Reports request received:', {
      hasAccessToken: !!accessToken,
      hasRealmId: !!realmId,
      reportType,
      startDate,
      endDate,
      columns,
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

    let queryParams = new URLSearchParams({
      minorversion: '65',
    });

    if (startDate) queryParams.set('start_date', startDate);
    if (endDate) queryParams.set('end_date', endDate);
    if (columns) queryParams.set('columns', columns);

    console.log('Fetching report from QuickBooks:', {
      endpoint,
      realmId,
      hasAccessToken: !!accessToken,
      queryParams: queryParams.toString(),
    });

    // Use sandbox API endpoint
    const response = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/${endpoint}?${queryParams.toString()}`,
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
    console.log('Raw QuickBooks API response:', {
      endpoint,
      hasData: !!data,
      dataKeys: Object.keys(data),
      responseStatus: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
    });

    // Add detailed logging of the report structure
    console.log('Report structure:', {
      hasRows: !!data.Rows,
      rowTypes: data.Rows?.Row?.map((row: any) => row.type),
      columnDefinitions: data.Columns?.Column,
      header: data.Header,
      reportName: data.Header?.ReportName,
      reportBasis: data.Header?.ReportBasis,
      currency: data.Header?.Currency,
      startPeriod: data.Header?.StartPeriod,
      endPeriod: data.Header?.EndPeriod,
      time: data.Header?.Time,
    });

    // Log first few rows for debugging
    if (data.Rows?.Row) {
      console.log('First few rows:', data.Rows.Row.slice(0, 3).map((row: any) => ({
        type: row.type,
        group: row.group,
        summary: row.Summary,
        data: row.ColData,
      })));
    }

    // Wrap the response in the expected structure
    const wrappedResponse = {
      QueryResponse: {
        Report: data
      }
    };

    console.log('Wrapped report data:', {
      endpoint,
      hasData: !!wrappedResponse,
      hasQueryResponse: !!wrappedResponse.QueryResponse,
      hasReport: !!wrappedResponse.QueryResponse?.Report,
      rowCount: wrappedResponse?.QueryResponse?.Report?.Rows?.Row?.length || 0,
    });

    return NextResponse.json(wrappedResponse);
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