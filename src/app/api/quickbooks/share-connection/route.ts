import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ACCESS_TOKEN_KEY = 'qb_access_token';
const REFRESH_TOKEN_KEY = 'qb_refresh_token';
const REALM_ID_KEY = 'qb_realm_id';
const COMPANY_ID = 'default_company'; // Replace with your real org/company ID if needed

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const { action, userId, accessToken, refreshToken, realmId } = await request.json();
    
    if (action === 'share') {
      // Get tokens from request body or fall back to cookies
      let finalAccessToken = accessToken;
      let finalRefreshToken = refreshToken;
      let finalRealmId = realmId;
      
      // If not provided in request body, try to get from cookies
      if (!finalAccessToken || !finalRefreshToken || !finalRealmId) {
        const cookieStore = cookies();
        finalAccessToken = cookieStore.get(ACCESS_TOKEN_KEY)?.value;
        finalRefreshToken = cookieStore.get(REFRESH_TOKEN_KEY)?.value;
        finalRealmId = cookieStore.get(REALM_ID_KEY)?.value;
      }
      
      if (!finalAccessToken || !finalRefreshToken || !finalRealmId) {
        return NextResponse.json({ 
          error: 'No active QuickBooks connection found. Please connect as admin first.' 
        }, { status: 400 });
      }
      
      console.log('Sharing QuickBooks connection:', {
        hasAccessToken: !!finalAccessToken,
        hasRefreshToken: !!finalRefreshToken,
        hasRealmId: !!finalRealmId,
        accessTokenLength: finalAccessToken?.length,
        refreshTokenLength: finalRefreshToken?.length,
        accessTokenStart: finalAccessToken?.substring(0, 20),
        refreshTokenStart: finalRefreshToken?.substring(0, 20),
      });
      
      // Upsert the shared connection in Supabase
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('shared_connections')
        .upsert({
          company_id: COMPANY_ID,
          access_token: finalAccessToken,
          refresh_token: finalRefreshToken,
          realm_id: finalRealmId,
          shared_by: userId || 'admin',
          shared_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id,realm_id' });
      
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
      const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();
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