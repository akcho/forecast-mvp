import { NextRequest, NextResponse } from 'next/server';
import { withCompanyValidation, getValidatedQBConnection } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export const GET = withCompanyValidation(async (request: NextRequest, context) => {
  try {
    // Get validated QuickBooks connection for this company
    const connectionResult = await getValidatedQBConnection(context.companyId, context.userId);
    
    if (!connectionResult.success) {
      return NextResponse.json({ 
        error: connectionResult.error,
        code: 'CONNECTION_ERROR'
      }, { status: 401 });
    }

    const { connection } = connectionResult;
    
    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${connection.realm_id}/companyinfo/${connection.realm_id}?minorversion=65`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
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
    console.error('Error in company API route:', error);
    return NextResponse.json({ error: 'Failed to fetch company info' }, { status: 500 });
  }
}); 