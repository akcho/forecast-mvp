import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const ACCESS_TOKEN_KEY = 'qb_access_token';
const REFRESH_TOKEN_KEY = 'qb_refresh_token';
const REALM_ID_KEY = 'qb_realm_id';

// In a real app, you'd store this in a database
// For now, we'll use a simple in-memory store (this will reset on server restart)
let sharedConnection: {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  sharedBy: string;
  sharedAt: Date;
} | null = null;

export async function POST(request: NextRequest) {
  try {
    const { action, userId } = await request.json();
    
    if (action === 'share') {
      // Get the current connection tokens from the admin
      const cookieStore = cookies();
      const accessToken = cookieStore.get(ACCESS_TOKEN_KEY)?.value;
      const refreshToken = cookieStore.get(REFRESH_TOKEN_KEY)?.value;
      const realmId = cookieStore.get(REALM_ID_KEY)?.value;
      
      if (!accessToken || !refreshToken || !realmId) {
        return NextResponse.json({ 
          error: 'No active QuickBooks connection found. Please connect as admin first.' 
        }, { status: 400 });
      }
      
      // Store the shared connection
      sharedConnection = {
        accessToken,
        refreshToken,
        realmId,
        sharedBy: userId || 'admin',
        sharedAt: new Date()
      };
      
      console.log('QuickBooks connection shared by admin:', {
        sharedBy: sharedConnection.sharedBy,
        sharedAt: sharedConnection.sharedAt,
        hasAccessToken: !!sharedConnection.accessToken,
        hasRefreshToken: !!sharedConnection.refreshToken,
        hasRealmId: !!sharedConnection.realmId
      });
      
      return NextResponse.json({
        success: true,
        message: 'Connection shared successfully. Other users can now access QuickBooks data.',
        hasConnection: true
      });
    }
    
    if (action === 'get') {
      if (!sharedConnection) {
        return NextResponse.json({ 
          error: 'No shared connection available. Please ask the admin to share the connection first.' 
        }, { status: 404 });
      }
      
      // Return the shared connection tokens
      return NextResponse.json({
        success: true,
        accessToken: sharedConnection.accessToken,
        refreshToken: sharedConnection.refreshToken,
        realmId: sharedConnection.realmId,
        sharedBy: sharedConnection.sharedBy,
        sharedAt: sharedConnection.sharedAt
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error with shared connection:', error);
    return NextResponse.json({ 
      error: 'Failed to handle shared connection' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      hasSharedConnection: !!sharedConnection,
      message: sharedConnection ? 'Shared connection available' : 'No shared connection found',
      sharedBy: sharedConnection?.sharedBy,
      sharedAt: sharedConnection?.sharedAt
    });
  } catch (error) {
    console.error('Error checking shared connection:', error);
    return NextResponse.json({ 
      error: 'Failed to check shared connection' 
    }, { status: 500 });
  }
} 