import { createClient } from '@supabase/supabase-js';

const COMPANY_ID = 'default_company'; // Replace with your real org/company ID if needed

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// Main function to get a valid shared connection (refresh if needed)
export async function getValidSharedConnection(): Promise<SharedConnection> {
  // 1. Fetch the shared connection from Supabase
  const { data, error } = await supabase
    .from('shared_connections')
    .select('*')
    .eq('company_id', COMPANY_ID)
    .single();

  if (error || !data) {
    throw new Error('No shared QuickBooks connection found');
  }

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
    // 3. Token expired, refresh it
    const refreshed = await refreshQuickBooksToken(data.refresh_token);
    // 4. Update Supabase with new tokens
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
  }

  // 6. Token is valid
  return data;
} 