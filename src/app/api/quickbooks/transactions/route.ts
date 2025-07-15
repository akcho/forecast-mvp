import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksService } from '@/lib/quickbooks/service';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let accessToken = request.headers.get('X-QB-Access-Token');
    let realmId = request.headers.get('X-QB-Realm-ID');
    const connectionId = request.headers.get('X-QB-Connection-ID');

    // If no access token is provided, get a valid connection from the database
    if (!accessToken || !realmId) {
      try {
        const connection = await getValidConnection(connectionId ? parseInt(connectionId) : undefined);
        accessToken = connection.access_token;
        realmId = connection.realm_id;
      } catch (error) {
        console.error('Error getting valid connection:', error);
        return NextResponse.json({ 
          error: 'No valid QuickBooks connection available. Please connect your QuickBooks account first.',
          code: 'NO_CONNECTION'
        }, { status: 401 });
      }
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