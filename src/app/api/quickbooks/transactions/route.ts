import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksService } from '@/lib/quickbooks/service';
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