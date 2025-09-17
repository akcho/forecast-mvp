import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to get QuickBooks connection tokens for authenticated requests
 * This provides access_token, realm_id, and refresh_token securely for frontend components
 * that need to make QuickBooks API calls with custom headers
 */
export async function GET(request: Request) {
  console.log('=== CONNECTION TOKENS API START ===');

  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session?.user?.dbId) {
      console.log('❌ User not authenticated');
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Get the active company ID from query params if provided
    const { searchParams } = new URL(request.url);
    const activeCompanyId = searchParams.get('company_id');

    console.log('Getting connection tokens for user:', session.user.dbId);
    console.log('Request parameters:', { activeCompanyId });

    // Get valid connection using the connection manager
    const connection = await getValidConnection(session.user.dbId, activeCompanyId || undefined);

    if (!connection) {
      console.log('❌ No valid connection found');
      return NextResponse.json({
        error: 'No QuickBooks connection found'
      }, { status: 404 });
    }

    // Return tokens for API requests
    const tokens = {
      access_token: connection.access_token,
      realm_id: connection.realm_id,
      refresh_token: connection.refresh_token,
      company_name: connection.company_name
    };

    console.log('✅ Connection tokens retrieved successfully for realm:', connection.realm_id);

    return NextResponse.json(tokens);

  } catch (error) {
    console.error('=== CONNECTION TOKENS API ERROR ===');
    console.error('Error getting connection tokens:', error);
    return NextResponse.json({
      error: 'Failed to get connection tokens'
    }, { status: 500 });
  }
}