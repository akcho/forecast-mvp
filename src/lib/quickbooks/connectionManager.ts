import { createClient } from '@supabase/supabase-js';

export interface QuickBooksConnection {
  id: number;
  user_id: string;
  company_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  company_name?: string;
  is_active: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string;
}

export interface ConnectionStatus {
  hasDirectConnection: boolean;
  availableConnections: QuickBooksConnection[];
  activeConnection?: QuickBooksConnection;
  error?: string;
}

// Create a singleton Supabase client to avoid multiple instances
let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    throw new Error('Supabase URL is missing. Please check your environment variables.');
  }
  
  // For client-side, we need to use the anon key, not the service role key
  // The service role key should only be used server-side
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseKey) {
    throw new Error('Supabase anon key is missing. Please check your environment variables.');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

// Generate a unique user ID for this browser session
function getUserId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let userId = localStorage.getItem('qb_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('qb_user_id', userId);
  }
  return userId;
}

// Get company ID (for now, using a default, but could be configurable)
function getCompanyId(): string {
  return 'default_company';
}

// Save a new connection to the database
export async function saveConnection(
  accessToken: string,
  refreshToken: string,
  realmId: string,
  companyName?: string
): Promise<QuickBooksConnection> {
  const supabase = getSupabaseClient();
  const userId = getUserId();
  const companyId = getCompanyId();

  console.log('Saving connection with:', { userId, companyId, realmId });

  const { data, error } = await supabase
    .from('quickbooks_connections')
    .upsert({
      user_id: userId,
      company_id: companyId,
      realm_id: realmId,
      access_token: accessToken,
      refresh_token: refreshToken,
      company_name: companyName,
      is_active: true,
      is_shared: false,
      updated_at: new Date().toISOString(),
      last_used_at: new Date().toISOString()
    }, { 
      onConflict: 'user_id,company_id,realm_id',
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving connection:', error);
    throw new Error('Failed to save QuickBooks connection');
  }

  return data;
}

// Get all available connections for the current user/company
export async function getAvailableConnections(): Promise<ConnectionStatus> {
  const supabase = getSupabaseClient();
  const userId = getUserId();
  const companyId = getCompanyId();

  console.log('Getting available connections for:', { userId, companyId });

  try {
    // Get user's direct connections
    const { data: directConnections, error: directError } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false });

    if (directError) {
      console.error('Error fetching direct connections:', directError);
    }

    console.log('Direct connections found:', directConnections?.length || 0);

    const allConnections = directConnections || [];

    console.log('All available connections:', allConnections.map(c => ({ id: c.id, user_id: c.user_id, company_id: c.company_id })));

    // Get the most recently used connection as active
    const activeConnection = allConnections.length > 0 ? allConnections[0] : undefined;

    return {
      hasDirectConnection: (directConnections?.length || 0) > 0,
      availableConnections: allConnections,
      activeConnection: activeConnection || undefined
    };
  } catch (error) {
    console.error('Error getting available connections:', error);
    return {
      hasDirectConnection: false,
      availableConnections: [],
      error: 'Failed to load connections'
    };
  }
}

// Share a connection with the team
export async function shareConnection(connectionId: number): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = getUserId();

  const { error } = await supabase
    .from('quickbooks_connections')
    .update({ 
      is_shared: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', connectionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error sharing connection:', error);
    throw new Error('Failed to share connection');
  }
}

// Unshare a connection
export async function unshareConnection(connectionId: number): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = getUserId();

  const { error } = await supabase
    .from('quickbooks_connections')
    .update({ 
      is_shared: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', connectionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error unsharing connection:', error);
    throw new Error('Failed to unshare connection');
  }
}

// Delete a connection
export async function deleteConnection(connectionId: number): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = getUserId();

  const { error } = await supabase
    .from('quickbooks_connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting connection:', error);
    throw new Error('Failed to delete connection');
  }
}

// Update connection last used timestamp
export async function updateConnectionUsage(connectionId: number): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('quickbooks_connections')
    .update({ 
      last_used_at: new Date().toISOString()
    })
    .eq('id', connectionId);

  if (error) {
    console.error('Error updating connection usage:', error);
  }
}

// Update all connections from a temp user ID to the real user ID
export async function migrateTempConnectionsToRealUser(tempUserId: string, realUserId: string) {
  const supabase = getSupabaseClient();
  const companyId = getCompanyId();
  if (!tempUserId || !realUserId || tempUserId === realUserId) return;
  console.log('Migrating connections from temp user ID to real user ID:', { tempUserId, realUserId, companyId });
  
  try {
    // Since the real user already has a connection for this QuickBooks company,
    // we can simply delete the temp connection to avoid conflicts
    const { error: deleteError } = await supabase
      .from('quickbooks_connections')
      .delete()
      .eq('user_id', tempUserId)
      .eq('company_id', companyId);
    
    if (deleteError) {
      console.error('Error deleting temp connections:', deleteError);
      throw new Error('Failed to delete temp QuickBooks connections');
    }
    
    console.log('Successfully deleted temp connections');
  } catch (error) {
    console.error('Error migrating temp connections:', error);
    throw new Error('Failed to migrate temp QuickBooks connections');
  }
}

// Get a valid connection (with automatic refresh)
export async function getValidConnection(connectionId?: number): Promise<QuickBooksConnection> {
  const { availableConnections } = await getAvailableConnections();
  
  console.log('Looking for connection ID:', connectionId);
  console.log('Available connection IDs:', availableConnections.map(c => c.id));
  
  let connection: QuickBooksConnection;
  
  if (connectionId) {
    const foundConnection = availableConnections.find(c => c.id === connectionId);
    if (!foundConnection) {
      console.error('Connection not found. Looking for ID:', connectionId);
      console.error('Available connections:', availableConnections);
      throw new Error('Connection not found');
    }
    connection = foundConnection;
  } else {
    if (availableConnections.length === 0) {
      throw new Error('No QuickBooks connections available');
    }
    const firstConnection = availableConnections[0];
    if (!firstConnection) {
      throw new Error('No QuickBooks connections available');
    }
    connection = firstConnection; // Use most recently used
  }

  // Test the connection via server-side endpoint to avoid CORS
  const testResponse = await fetch('/api/quickbooks/test-connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      realmId: connection.realm_id,
      accessToken: connection.access_token
    }),
  });

  if (!testResponse.ok) {
    const errorData = await testResponse.json();
    if (testResponse.status === 401 || testResponse.status === 403) {
      // Token expired, try to refresh it
      try {
        const refreshed = await refreshQuickBooksToken(connection.refresh_token);
        
        // Update the connection with new tokens
        const supabase = getSupabaseClient();
        const { error: updateError } = await supabase
          .from('quickbooks_connections')
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);
          
        if (updateError) {
          throw new Error('Failed to update refreshed tokens');
        }
        
        // Update connection usage
        await updateConnectionUsage(connection.id);
        
        // Return the updated connection
        return {
          ...connection,
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
        };
      } catch (refreshError) {
        // Refresh token has also expired, mark connection as inactive
        const supabase = getSupabaseClient();
        await supabase
          .from('quickbooks_connections')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);
          
        throw new Error('TOKEN_EXPIRED_REFRESH_FAILED');
      }
    } else {
      // Other error, throw it
      throw new Error(`Connection test failed: ${errorData.error || 'Unknown error'}`);
    }
  }

  // Connection is valid, update usage
  await updateConnectionUsage(connection.id);
  return connection;
}

// Helper to refresh the QuickBooks token
async function refreshQuickBooksToken(refreshToken: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/quickbooks/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-QB-Refresh-Token': refreshToken,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh QuickBooks token');
  }
  
  return response.json();
} 