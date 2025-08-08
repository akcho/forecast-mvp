import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface QuickBooksConnection {
  id: number;
  user_id: string;
  company_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  company_name?: string;
  user_email?: string;
  user_name?: string;
  is_active: boolean;
  is_shared: boolean;
  is_service_account?: boolean;
  display_name?: string;
  created_at: string;
  updated_at: string;
  last_used_at: string;
}

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
    
    console.log('🧹 Starting cleanup of duplicate QuickBooks connections...');
    
    // Get all active connections
    const { data: connections, error } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`);
    }
    
    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active connections found',
        stats: { total: 0, deleted: 0, updated: 0 }
      });
    }
    
    console.log(`Found ${connections.length} active connections`);
    
    // Group connections by realm_id
    const connectionsByRealm = new Map<string, QuickBooksConnection[]>();
    
    for (const connection of connections) {
      const realmId = connection.realm_id;
      if (!connectionsByRealm.has(realmId)) {
        connectionsByRealm.set(realmId, []);
      }
      connectionsByRealm.get(realmId)!.push(connection);
    }
    
    console.log(`Found connections for ${connectionsByRealm.size} different companies`);
    
    let totalDeleted = 0;
    let totalUpdated = 0;
    const results = [];
    
    // Process each realm_id
    for (const [realmId, realmConnections] of connectionsByRealm) {
      if (realmConnections.length === 1) {
        const connection = realmConnections[0];
        
        // Ensure single connection is marked as service account and shared
        if (!connection.is_service_account || !connection.is_shared) {
          console.log(`Updating realm ${realmId} to service account status`);
          
          const { error: updateError } = await supabase
            .from('quickbooks_connections')
            .update({
              is_service_account: true,
              is_shared: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', connection.id);
            
          if (updateError) {
            console.error(`Error updating connection:`, updateError);
            results.push({
              realmId,
              action: 'update_failed',
              error: updateError.message
            });
          } else {
            console.log(`Updated connection to service account`);
            totalUpdated++;
            results.push({
              realmId,
              action: 'updated_to_service_account',
              connectionId: connection.id
            });
          }
        } else {
          results.push({
            realmId,
            action: 'no_change_needed',
            connectionId: connection.id
          });
        }
        continue;
      }
      
      console.log(`Realm ${realmId}: Found ${realmConnections.length} duplicate connections`);
      
      // Sort by creation date (newest first)
      realmConnections.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Keep the most recent connection as the service account
      const keepConnection = realmConnections[0];
      const deleteConnections = realmConnections.slice(1);
      
      console.log(`Keeping connection ${keepConnection.id}, deleting ${deleteConnections.length} others`);
      
      // Update the kept connection to be a service account
      const { error: updateError } = await supabase
        .from('quickbooks_connections')
        .update({
          is_service_account: true,
          is_shared: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', keepConnection.id);
        
      if (updateError) {
        console.error(`Error updating kept connection:`, updateError);
        results.push({
          realmId,
          action: 'update_failed',
          error: updateError.message
        });
        continue;
      }
      
      totalUpdated++;
      
      // Delete duplicate connections
      const deletedIds = [];
      for (const deleteConnection of deleteConnections) {
        const { error: deleteError } = await supabase
          .from('quickbooks_connections')
          .delete()
          .eq('id', deleteConnection.id);
          
        if (deleteError) {
          console.error(`Error deleting connection ${deleteConnection.id}:`, deleteError);
        } else {
          console.log(`Deleted connection ${deleteConnection.id}`);
          totalDeleted++;
          deletedIds.push(deleteConnection.id);
        }
      }
      
      results.push({
        realmId,
        action: 'cleaned_duplicates',
        keptConnectionId: keepConnection.id,
        deletedConnectionIds: deletedIds,
        duplicatesFound: realmConnections.length
      });
    }
    
    console.log(`Cleanup completed! Updated ${totalUpdated}, deleted ${totalDeleted} connections`);
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      stats: {
        total: connections.length,
        companies: connectionsByRealm.size,
        updated: totalUpdated,
        deleted: totalDeleted
      },
      results
    });
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}