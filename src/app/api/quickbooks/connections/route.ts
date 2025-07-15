import { NextRequest, NextResponse } from 'next/server';
import { getAvailableConnections, saveConnection, shareConnection, unshareConnection, deleteConnection } from '@/lib/quickbooks/connectionManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const connections = await getAvailableConnections();
    return NextResponse.json(connections);
  } catch (error) {
    console.error('Error getting connections:', error);
    return NextResponse.json({ 
      error: 'Failed to get connections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, connectionId, accessToken, refreshToken, realmId, companyName } = await request.json();
    
    switch (action) {
      case 'save':
        if (!accessToken || !refreshToken || !realmId) {
          return NextResponse.json({ 
            error: 'Missing required connection data' 
          }, { status: 400 });
        }
        
        const savedConnection = await saveConnection(accessToken, refreshToken, realmId, companyName);
        return NextResponse.json({
          success: true,
          connection: savedConnection,
          message: 'Connection saved successfully'
        });
        
      case 'share':
        if (!connectionId) {
          return NextResponse.json({ 
            error: 'Missing connection ID' 
          }, { status: 400 });
        }
        
        await shareConnection(connectionId);
        return NextResponse.json({
          success: true,
          message: 'Connection shared successfully'
        });
        
      case 'unshare':
        if (!connectionId) {
          return NextResponse.json({ 
            error: 'Missing connection ID' 
          }, { status: 400 });
        }
        
        await unshareConnection(connectionId);
        return NextResponse.json({
          success: true,
          message: 'Connection unshared successfully'
        });
        
      case 'delete':
        if (!connectionId) {
          return NextResponse.json({ 
            error: 'Missing connection ID' 
          }, { status: 400 });
        }
        
        await deleteConnection(connectionId);
        return NextResponse.json({
          success: true,
          message: 'Connection deleted successfully'
        });
        
      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error with connection action:', error);
    return NextResponse.json({ 
      error: 'Failed to perform connection action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 