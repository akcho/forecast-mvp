import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getConnectionStatus } from '@/lib/quickbooks/connectionManager';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('=== QUICKBOOKS STATUS API START ===');
  console.log('Request URL:', request.url);
  
  try {
    // Check if user is authenticated
    console.log('Checking user authentication...');
    const session = await getServerSession(authOptions);
    
    console.log('Session status:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userDbId: session?.user?.dbId,
      userEmail: session?.user?.email
    });
    
    if (!session?.user?.dbId) {
      console.log('❌ User not authenticated, returning not authenticated');
      return NextResponse.json({
        isAuthenticated: false,
        error: 'Not authenticated'
      });
    }

    // Get the active company ID from query params if provided
    const { searchParams } = new URL(request.url);
    const activeCompanyId = searchParams.get('company_id');
    
    console.log('Request parameters:', { activeCompanyId });

    // Get connection status for user (use service key for server-side API)
    console.log('Getting connection status for user:', session.user.dbId);
    const connectionStatus = await getConnectionStatus(session.user.dbId, activeCompanyId || undefined, true);
    
    console.log('Connection status result:', {
      error: connectionStatus.error,
      userCompaniesCount: connectionStatus.userCompanies.length,
      activeCompanyId: connectionStatus.activeCompanyId,
      hasCompanyConnection: !!connectionStatus.companyConnection,
      connectionId: connectionStatus.companyConnection?.id
    });

    if (connectionStatus.error) {
      console.log('❌ Connection status has error:', connectionStatus.error);
      const errorResponse = {
        isAuthenticated: false,
        error: connectionStatus.error,
        userCompanies: connectionStatus.userCompanies
      };
      console.log('Returning error response:', errorResponse);
      return NextResponse.json(errorResponse);
    }

    const hasConnection = !!connectionStatus.companyConnection;
    console.log('Connection status determined:', { hasConnection });

    const responseData = {
      isAuthenticated: hasConnection,
      hasConnection,
      userCompanies: connectionStatus.userCompanies,
      activeCompanyId: connectionStatus.activeCompanyId,
      companyConnection: connectionStatus.companyConnection ? {
        id: connectionStatus.companyConnection.id,
        company_id: connectionStatus.companyConnection.company_id,
        realm_id: connectionStatus.companyConnection.realm_id,
        company_name: connectionStatus.companyConnection.company_name,
        connected_at: connectionStatus.companyConnection.connected_at,
        last_used_at: connectionStatus.companyConnection.last_used_at,
        is_active: connectionStatus.companyConnection.is_active
      } : null
    };
    
    console.log('✅ Status API success, returning data:', {
      isAuthenticated: responseData.isAuthenticated,
      hasConnection: responseData.hasConnection,
      userCompaniesCount: responseData.userCompanies.length,
      activeCompanyId: responseData.activeCompanyId,
      hasCompanyConnection: !!responseData.companyConnection
    });
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('=== QUICKBOOKS STATUS API ERROR ===');
    console.error('Error checking QB status:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({
      isAuthenticated: false,
      error: 'Failed to check connection status'
    }, { status: 500 });
  }
}