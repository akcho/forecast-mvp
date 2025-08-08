import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const supabase = getSupabaseClient();
    
    // First, get a count of existing connections
    const { count: totalCount, error: countError } = await supabase
      .from('quickbooks_connections')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw new Error(`Failed to count connections: ${countError.message}`);
    }
    
    console.log(`Found ${totalCount} total connections to delete`);
    
    // Delete all connections
    const { error: deleteError } = await supabase
      .from('quickbooks_connections')
      .delete()
      .neq('id', 0); // This will delete all records since no ID is 0
    
    if (deleteError) {
      throw new Error(`Failed to delete connections: ${deleteError.message}`);
    }
    
    // Verify deletion
    const { count: remainingCount, error: verifyError } = await supabase
      .from('quickbooks_connections')
      .select('*', { count: 'exact', head: true });
    
    if (verifyError) {
      console.warn('Could not verify deletion:', verifyError);
    }
    
    console.log(`Deleted ${totalCount} connections. Remaining: ${remainingCount || 0}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${totalCount} QuickBooks connections`,
      deleted: totalCount,
      remaining: remainingCount || 0
    });
    
  } catch (error) {
    console.error('Clear connections error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}