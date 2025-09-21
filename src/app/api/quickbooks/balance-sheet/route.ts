import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { getQuickBooksApiUrl } from '@/lib/quickbooks/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const summarizeColumnBy = searchParams.get('summarize_column_by');

    // Get valid connection (handles token refresh automatically)
    // Pass company_id to use selected company instead of defaulting to first
    const connection = await getValidConnection(session.user.dbId, companyId || undefined);
    const accessToken = connection.access_token;
    const realmId = connection.realm_id;

    // Build the QuickBooks API URL with parameters
    let url = `${getQuickBooksApiUrl(realmId, 'reports/BalanceSheet')}?minorversion=65`;
    
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