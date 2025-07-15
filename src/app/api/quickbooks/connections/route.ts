import { NextRequest, NextResponse } from 'next/server';
import { getAvailableConnections, saveConnection, shareConnection, unshareConnection, deleteConnection } from '@/lib/quickbooks/connectionManager';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function updateConnectionUserId(connectionId: number, userId?: string) {
  const supabase = getSupabaseClient();
  
  // Use provided user ID or generate a new one
  const finalUserId = userId || `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const companyId = 'default_company';
  
  console.log('Updating connection user ID:', { connectionId, finalUserId, companyId });
  
  const { error } = await supabase
    .from('quickbooks_connections')
    .update({ 
      user_id: finalUserId,
      company_id: companyId,
      updated_at: new Date().toISOString()
    })
    .eq('id', connectionId);

  if (error) {
    console.error('Error updating connection user ID:', error);
    throw new Error('Failed to update connection user ID');
  }
}

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
    const { action, connectionId, accessToken, refreshToken, realmId, companyName, userId } = await request.json();
    
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
        
      case 'update_user_id':
        if (!connectionId) {
          return NextResponse.json({ 
            error: 'Missing connection ID' 
          }, { status: 400 });
        }
        
        await updateConnectionUserId(connectionId, userId);
        return NextResponse.json({
          success: true,
          message: 'Connection user ID updated successfully'
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