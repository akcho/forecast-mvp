import { createClient } from '@supabase/supabase-js';

const COMPANY_ID = 'default_company'; // Replace with your real org/company ID if needed

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

interface SharedConnection {
  access_token: string;
  refresh_token: string;
  realm_id: string;
  shared_by: string;
  shared_at: string;
  updated_at: string;
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

// Helper function to handle shared connection errors consistently
export function handleSharedConnectionError(error: unknown): { error: string; code?: string; status: number } {
  if (error instanceof Error && error.message === 'TOKEN_EXPIRED_REFRESH_FAILED') {
    return {
      error: 'QuickBooks tokens have expired. Admin needs to reconnect and re-share the connection.',
      code: 'TOKEN_EXPIRED',
      status: 401
    };
  }
  
  if (error instanceof Error && error.message === 'No shared QuickBooks connection found') {
    return {
      error: 'No shared QuickBooks connection found. Admin needs to connect and share the connection.',
      code: 'NO_SHARED_CONNECTION',
      status: 400
    };
  }
  
  return {
    error: 'Failed to access QuickBooks connection',
    status: 500
  };
}

// Main function to get a valid shared connection (refresh if needed)
export async function getValidSharedConnection(): Promise<SharedConnection> {
  // 1. Fetch the shared connection from Supabase
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('shared_connections')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .single();

  if (error || !data) {
    throw new Error('No shared QuickBooks connection found');
  }
  
  console.log('Retrieved shared connection:', {
    hasAccessToken: !!data.access_token,
    hasRefreshToken: !!data.refresh_token,
    hasRealmId: !!data.realm_id,
    accessTokenLength: data.access_token?.length,
    refreshTokenLength: data.refresh_token?.length,
    accessTokenStart: data.access_token?.substring(0, 20),
    refreshTokenStart: data.refresh_token?.substring(0, 20),
    sharedAt: data.shared_at,
    updatedAt: data.updated_at,
  });

  // 2. Try a test API call to QuickBooks (e.g., company info)
  const testResponse = await fetch(
    `https://sandbox-quickbooks.api.intuit.com/v3/company/${data.realm_id}/companyinfo/${data.realm_id}`,
    {
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
        'Accept': 'application/json',
      },
    }
  );

  if (testResponse.status === 401 || testResponse.status === 403) {
    // 3. Token expired, try to refresh it
    try {
      const refreshed = await refreshQuickBooksToken(data.refresh_token);
      // 4. Update Supabase with new tokens
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('shared_connections')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', COMPANY_ID)
        .eq('realm_id', data.realm_id);
      if (updateError) {
        throw new Error('Failed to update refreshed tokens in Supabase');
      }
      // 5. Return the new tokens
      return {
        ...data,
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
      };
    } catch (refreshError) {
      // Refresh token has also expired, throw a specific error
      throw new Error('TOKEN_EXPIRED_REFRESH_FAILED');
    }
  }

  // 6. Token is valid
  return data;
} 