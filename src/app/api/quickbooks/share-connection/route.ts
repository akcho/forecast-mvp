import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ACCESS_TOKEN_KEY = 'qb_access_token';
const REFRESH_TOKEN_KEY = 'qb_refresh_token';
const REALM_ID_KEY = 'qb_realm_id';
const COMPANY_ID = 'default_company'; // Replace with your real org/company ID if needed

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      
      // Upsert the shared connection in Supabase
      const { error } = await supabase
        .from('shared_connections')
        .upsert({
          company_id: COMPANY_ID,
          access_token: accessToken,
          refresh_token: refreshToken,
          realm_id: realmId,
          shared_by: userId || 'admin',
          shared_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id' });
      
      if (error) {
        console.error('Supabase upsert error:', error);
        return NextResponse.json({ error: 'Failed to share connection (Supabase error)' }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Connection shared successfully. Other users can now access QuickBooks data.',
        hasConnection: true
      });
    }
    
    if (action === 'get') {
      // Fetch the shared connection from Supabase
      const { data, error } = await supabase
        .from('shared_connections')
        .select('*')
        .eq('company_id', COMPANY_ID)
        .single();
      
      if (error || !data) {
        return NextResponse.json({ 
          error: 'No shared connection available. Please ask the admin to share the connection first.' 
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        realmId: data.realm_id,
        sharedBy: data.shared_by,
        sharedAt: data.shared_at
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
    // Fetch the shared connection from Supabase
    const { data, error } = await supabase
      .from('shared_connections')
      .select('*')
      .eq('company_id', COMPANY_ID)
      .single();
    
    return NextResponse.json({
      hasSharedConnection: !!data,
      message: data ? 'Shared connection available' : 'No shared connection found',
      sharedBy: data?.shared_by,
      sharedAt: data?.shared_at
    });
  } catch (error) {
    console.error('Error checking shared connection:', error);
    return NextResponse.json({ 
      error: 'Failed to check shared connection' 
    }, { status: 500 });
  }
} 