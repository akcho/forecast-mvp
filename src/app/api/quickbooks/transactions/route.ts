import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksService } from '@/lib/quickbooks/service';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.headers.get('X-QB-Access-Token');
    const realmId = request.headers.get('X-QB-Realm-ID');

    if (!accessToken || !realmId) {
      console.error('Missing QuickBooks credentials:', { 
        hasAccessToken: !!accessToken, 
        hasRealmId: !!realmId,
        headers: Object.fromEntries(request.headers.entries())
      });
      return NextResponse.json({ error: 'Missing QuickBooks credentials' }, { status: 400 });
    }

    console.log('Processing request with:', { 
      accessToken: accessToken.substring(0, 10) + '...', 
      realmId,
      headers: Object.fromEntries(request.headers.entries())
    });

    const quickbooks = QuickBooksService.getInstance();
    const transactions = await quickbooks.getTransactions(accessToken, realmId);

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error in transactions API route:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 