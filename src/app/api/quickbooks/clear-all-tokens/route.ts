import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const COMPANY_ID = 'default_company';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST() {
  try {
    // Clear browser cookies
    const response = NextResponse.json({ 
      success: true, 
      message: 'All tokens cleared successfully' 
    });
    
    // Clear QuickBooks cookies
    response.cookies.delete('qb_access_token');
    response.cookies.delete('qb_refresh_token');
    response.cookies.delete('qb_realm_id');
    
    // Clear shared connection from Supabase
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('shared_connections')
        .delete()
        .eq('company_id', COMPANY_ID);
      
      if (error) {
        console.error('Error clearing shared connection:', error);
      } else {
        console.log('Shared connection cleared from Supabase');
      }
    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      // Don't fail the request if Supabase is not available
    }
    
    return response;
  } catch (error) {
    console.error('Error clearing tokens:', error);
    return NextResponse.json({ 
      error: 'Failed to clear tokens' 
    }, { status: 500 });
  }
} 