#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

// Script to clean up duplicate QuickBooks connections per realm_id

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
    throw new Error('Supabase credentials are missing. Please check your environment variables.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function cleanupDuplicateConnections(): Promise<void> {
  const supabase = getSupabaseClient();
  
  console.log('🧹 Starting cleanup of duplicate QuickBooks connections...\n');
  
  // Get all active connections grouped by realm_id
  const { data: connections, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch connections: ${error.message}`);
  }
  
  if (!connections || connections.length === 0) {
    console.log('No active connections found.');
    return;
  }
  
  console.log(`Found ${connections.length} active connections\n`);
  
  // Group connections by realm_id
  const connectionsByRealm = new Map<string, QuickBooksConnection[]>();
  
  for (const connection of connections) {
    const realmId = connection.realm_id;
    if (!connectionsByRealm.has(realmId)) {
      connectionsByRealm.set(realmId, []);
    }
    connectionsByRealm.get(realmId)!.push(connection);
  }
  
  console.log(`Found connections for ${connectionsByRealm.size} different companies\n`);
  
  let totalDeleted = 0;
  
  // Process each realm_id
  for (const [realmId, realmConnections] of connectionsByRealm) {
    if (realmConnections.length === 1) {
      console.log(`✓ Realm ${realmId}: Only 1 connection, no duplicates`);
      
      // Ensure single connection is marked as service account and shared
      const connection = realmConnections[0];
      if (!connection.is_service_account || !connection.is_shared) {
        console.log(`  → Updating to service account status`);
        
        const { error: updateError } = await supabase
          .from('quickbooks_connections')
          .update({
            is_service_account: true,
            is_shared: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);
          
        if (updateError) {
          console.error(`  ✗ Error updating connection:`, updateError);
        } else {
          console.log(`  ✓ Updated connection to service account`);
        }
      }
      continue;
    }
    
    console.log(`⚠ Realm ${realmId}: Found ${realmConnections.length} duplicate connections`);
    
    // Sort by creation date (newest first)
    realmConnections.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Keep the most recent connection as the service account
    const keepConnection = realmConnections[0];
    const deleteConnections = realmConnections.slice(1);
    
    console.log(`  → Keeping connection ${keepConnection.id} (created: ${keepConnection.created_at})`);
    console.log(`  → Deleting ${deleteConnections.length} older connections`);
    
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
      console.error(`  ✗ Error updating kept connection:`, updateError);
      continue;
    }
    
    // Delete duplicate connections
    for (const deleteConnection of deleteConnections) {
      console.log(`  → Deleting connection ${deleteConnection.id} (created: ${deleteConnection.created_at})`);
      
      const { error: deleteError } = await supabase
        .from('quickbooks_connections')
        .delete()
        .eq('id', deleteConnection.id);
        
      if (deleteError) {
        console.error(`  ✗ Error deleting connection ${deleteConnection.id}:`, deleteError);
      } else {
        console.log(`  ✓ Deleted connection ${deleteConnection.id}`);
        totalDeleted++;
      }
    }
    
    console.log(); // Empty line for readability
  }
  
  console.log(`✅ Cleanup completed! Deleted ${totalDeleted} duplicate connections`);
}

async function main() {
  try {
    await cleanupDuplicateConnections();
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
main();