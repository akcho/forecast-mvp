import { NextRequest, NextResponse } from 'next/server';

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

    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const summarizeColumnBy = searchParams.get('summarize_column_by');

    // Build the QuickBooks API URL with parameters
    let url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/CashFlow?minorversion=65`;
    
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
    console.error('Error in cash flow API route:', error);
    return NextResponse.json({ error: 'Failed to fetch cash flow' }, { status: 500 });
  }
} 