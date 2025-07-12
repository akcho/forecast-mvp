import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    // Clear the existing shared connection
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('shared_connections')
      .delete()
      .eq('company_id', COMPANY_ID);

    if (error) {
      console.error('Error clearing shared connection:', error);
      return NextResponse.json({ error: 'Failed to clear shared connection' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shared connection cleared. Please reconnect as admin and re-share the connection.'
    });
  } catch (error) {
    console.error('Error in force refresh:', error);
    return NextResponse.json({ 
      error: 'Failed to force refresh connection' 
    }, { status: 500 });
  }
} 