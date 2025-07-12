import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const COMPANY_ID = 'default_company';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Clear the existing shared connection
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