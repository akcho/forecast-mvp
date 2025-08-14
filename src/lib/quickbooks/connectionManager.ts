import { createClient } from '@supabase/supabase-js';

// Updated interface for company-owned connections
export interface QuickBooksConnection {
  id: string;
  company_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  company_name?: string;
  
  // Audit fields
  connected_by_user_id?: string;
  connected_at: string;
  
  // Token management
  token_expires_at?: string;
  last_refreshed_at: string;
  last_used_at: string;
  refresh_token_expires_at?: string;
  
  // Status
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  quickbooks_realm_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserCompanyRole {
  id: string;
  user_id: string;
  company_id: string;
  role: 'admin' | 'viewer';
  created_at: string;
}

export interface ConnectionStatus {
  userCompanies: Company[];
  activeCompanyId?: string;
  companyConnection?: QuickBooksConnection;
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
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseKey) {
    throw new Error('Supabase anon key is missing. Please check your environment variables.');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

// Get all companies a user has access to
export async function getUserCompanies(userId: string, useServiceKey = false): Promise<Company[]> {
  console.log('=== GET USER COMPANIES START ===');
  console.log('User ID:', userId);
  console.log('Use service key:', useServiceKey);
  
  let supabase;
  if (useServiceKey) {
    // Use service role key for server-side operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing for server-side operation');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase SERVICE client obtained');
  } else {
    supabase = getSupabaseClient();
    console.log('✅ Supabase ANON client obtained');
  }
  
  console.log('Executing user companies query with user_id:', userId);
  const { data, error } = await supabase
    .from('user_company_roles')
    .select(`
      company_id,
      role,
      companies:company_id (
        id,
        quickbooks_realm_id,
        name,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId);
    
  console.log('Raw query data returned:', {
    data: data,
    hasData: !!data,
    dataCount: data?.length || 0
  });
    
  console.log('User companies query result:', {
    hasData: !!data,
    dataLength: data?.length || 0,
    hasError: !!error,
    errorMessage: error?.message,
    errorCode: error?.code
  });
    
  if (error) {
    console.error('❌ ERROR FETCHING USER COMPANIES:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw new Error('Failed to fetch user companies');
  }
  
  const companies = data?.map((item: any) => item.companies).filter(Boolean) || [];
  
  console.log('✅ User companies processed:', {
    rawDataLength: data?.length || 0,
    companiesAfterFilter: companies.length,
    companies: companies.map((c: any) => ({ id: c?.id, name: c?.name, realmId: c?.quickbooks_realm_id }))
  });
  
  return companies;
}

// Get QuickBooks connection for a specific company
export async function getCompanyConnection(companyId: string, useServiceKey = false): Promise<QuickBooksConnection | null> {
  console.log('=== GET COMPANY CONNECTION START ===');
  console.log('Company ID:', companyId);
  console.log('Use service key:', useServiceKey);
  
  let supabase;
  if (useServiceKey) {
    // Use service role key for server-side operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing for server-side operation');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase SERVICE client obtained');
  } else {
    supabase = getSupabaseClient();
    console.log('✅ Supabase ANON client obtained');
  }
  
  const { data, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();
    
  console.log('Company connection query result:', {
    hasData: !!data,
    hasError: !!error,
    errorMessage: error?.message,
    errorCode: error?.code,
    connectionId: data?.id,
    isActive: data?.is_active,
    realmId: data?.realm_id
  });
    
  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      console.log('✅ No connection found for company (normal case)');
      return null;
    }
    console.error('❌ ERROR FETCHING COMPANY CONNECTION:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw new Error('Failed to fetch company connection');
  }
  
  console.log('✅ Company connection found:', {
    id: data.id,
    company_id: data.company_id,
    realm_id: data.realm_id,
    company_name: data.company_name,
    is_active: data.is_active,
    connected_at: data.connected_at
  });
  
  return data;
}

// Get connection status for a user (their companies and active connection)
export async function getConnectionStatus(userId: string, activeCompanyId?: string, useServiceKey = false): Promise<ConnectionStatus> {
  console.log('=== GET CONNECTION STATUS START ===');
  console.log('Parameters:', { userId, activeCompanyId, useServiceKey });
  
  try {
    console.log('Getting user companies...');
    const userCompanies = await getUserCompanies(userId, useServiceKey);
    
    console.log('User companies result:', {
      companiesFound: userCompanies.length,
      companies: userCompanies.map((c: any) => ({ id: c.id, name: c.name, realmId: c.quickbooks_realm_id }))
    });
    
    if (userCompanies.length === 0) {
      console.log('❌ No companies found for user');
      return {
        userCompanies: [],
        error: 'No companies found for user'
      };
    }
    
    // Use provided company or default to first company
    const targetCompanyId = activeCompanyId || userCompanies[0]?.id;
    
    console.log('Target company selection:', {
      provided: activeCompanyId,
      selected: targetCompanyId,
      firstCompanyId: userCompanies[0]?.id
    });
    
    if (!targetCompanyId) {
      console.log('❌ No company selected');
      return {
        userCompanies,
        error: 'No company selected'
      };
    }
    
    console.log('Getting company connection for company:', targetCompanyId);
    const companyConnection = await getCompanyConnection(targetCompanyId, useServiceKey);
    
    console.log('Company connection result:', {
      found: !!companyConnection,
      connectionId: companyConnection?.id,
      isActive: companyConnection?.is_active,
      realmId: companyConnection?.realm_id,
      companyName: companyConnection?.company_name
    });
    
    const result = {
      userCompanies,
      activeCompanyId: targetCompanyId,
      companyConnection: companyConnection || undefined
    };
    
    console.log('✅ Connection status success:', {
      userCompaniesCount: result.userCompanies.length,
      activeCompanyId: result.activeCompanyId,
      hasConnection: !!result.companyConnection
    });
    
    return result;
    
  } catch (error) {
    console.error('=== GET CONNECTION STATUS ERROR ===');
    console.error('Error getting connection status:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return {
      userCompanies: [],
      error: 'Failed to load connection status'
    };
  }
}

// Create or update a company-owned QuickBooks connection (server-side with service role)
export async function saveCompanyConnection(
  companyId: string,
  realmId: string,
  accessToken: string,
  refreshToken: string,
  companyName?: string,
  connectedByUserId?: string
): Promise<QuickBooksConnection> {
  // Use service role key for server-side operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Environment variables check:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceRoleKey: !!supabaseKey,
    supabaseUrlLength: supabaseUrl?.length || 0,
    serviceRoleKeyLength: supabaseKey?.length || 0
  });
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ MISSING SUPABASE CONFIGURATION');
    console.error('Environment check:', {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    throw new Error('Supabase configuration missing for server-side operation');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase service client created for saveCompanyConnection');
  
  console.log('=== SAVE COMPANY CONNECTION START ===');
  console.log('Parameters:', { 
    companyId, 
    realmId, 
    companyName, 
    connectedByUserId,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken 
  });
  
  // Check if connection already exists for this company OR this realm ID
  console.log('Checking for existing connection for company:', companyId);
  console.log('Also checking for existing connection for realm ID:', realmId);
  
  let existingConnection;
  try {
    // First check by company_id
    existingConnection = await getCompanyConnection(companyId);
    console.log('Existing connection check by company_id result:', {
      found: !!existingConnection,
      connectionId: existingConnection?.id,
      isActive: existingConnection?.is_active
    });
  } catch (connectionCheckError) {
    console.error('Error checking existing connection by company_id:', connectionCheckError);
    existingConnection = null;
  }
  
  // If no connection found by company_id, check by realm_id to handle constraint violation
  if (!existingConnection) {
    console.log('No connection found by company_id, checking by realm_id...');
    try {
      const { data: realmConnection, error: realmError } = await supabase
        .from('quickbooks_connections')
        .select('*')
        .eq('realm_id', realmId)
        .eq('is_active', true)
        .single();
        
      console.log('Existing connection check by realm_id result:', {
        hasData: !!realmConnection,
        hasError: !!realmError,
        errorCode: realmError?.code,
        connectionId: realmConnection?.id,
        existingCompanyId: realmConnection?.company_id
      });
        
      if (realmConnection) {
        console.log('⚠️ Found existing connection for this realm_id with different company_id');
        console.log('This will be updated to the new company_id:', companyId);
        existingConnection = realmConnection;
      }
    } catch (realmCheckError) {
      console.error('Error checking existing connection by realm_id:', realmCheckError);
    }
  }
  
  const timestamp = new Date().toISOString();
  const connectionData = {
    company_id: companyId,
    realm_id: realmId,
    access_token: accessToken,
    refresh_token: refreshToken,
    company_name: companyName,
    connected_by_user_id: connectedByUserId,
    is_active: true,
    last_refreshed_at: timestamp,
    last_used_at: timestamp,
    updated_at: timestamp
  };
  
  console.log('Connection data prepared:', {
    company_id: connectionData.company_id,
    realm_id: connectionData.realm_id,
    company_name: connectionData.company_name,
    connected_by_user_id: connectionData.connected_by_user_id,
    is_active: connectionData.is_active,
    hasAccessToken: !!connectionData.access_token,
    hasRefreshToken: !!connectionData.refresh_token
  });
  
  if (existingConnection) {
    // Update existing connection
    console.log('Updating existing connection:', existingConnection.id);
    console.log('Update will change:', {
      oldCompanyId: existingConnection.company_id,
      newCompanyId: companyId,
      oldRealmId: existingConnection.realm_id,
      newRealmId: realmId,
      oldConnectedByUserId: existingConnection.connected_by_user_id,
      newConnectedByUserId: connectedByUserId
    });
    
    const { data, error } = await supabase
      .from('quickbooks_connections')
      .update(connectionData)
      .eq('id', existingConnection.id)
      .select()
      .single();
      
    if (error) {
      console.error('❌ ERROR UPDATING CONNECTION:', error);
      console.error('Update error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to update QuickBooks connection: ${error.message}`);
    }
    
    console.log('✅ Connection updated successfully:', data.id);
    return data;
  } else {
    // Create new connection
    console.log('Creating new connection...');
    const insertData = {
      ...connectionData,
      connected_at: timestamp,
      created_at: timestamp
    };
    
    console.log('Insert data prepared:', {
      company_id: insertData.company_id,
      realm_id: insertData.realm_id,
      company_name: insertData.company_name,
      connected_by_user_id: insertData.connected_by_user_id,
      is_active: insertData.is_active,
      connected_at: insertData.connected_at,
      created_at: insertData.created_at
    });
    
    const { data, error } = await supabase
      .from('quickbooks_connections')
      .insert(insertData)
      .select()
      .single();
      
    if (error) {
      console.error('❌ ERROR CREATING CONNECTION:', error);
      console.error('Insert error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to create QuickBooks connection: ${error.message}`);
    }
    
    console.log('✅ New connection created successfully:', data.id);
    console.log('=== SAVE COMPANY CONNECTION SUCCESS ===');
    return data;
  }
}

// Update connection usage timestamp
export async function updateConnectionUsage(connectionId: string): Promise<void> {
  // Use service role key for server-side operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing for connection usage update');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
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

// Get a valid connection with automatic token refresh
export async function getValidConnection(
  userId: string, 
  companyId?: string
): Promise<QuickBooksConnection> {
  const connectionStatus = await getConnectionStatus(userId, companyId, true);
  
  if (!connectionStatus.companyConnection) {
    throw new Error('No QuickBooks connection found for this company');
  }
  
  const connection = connectionStatus.companyConnection;
  
  // Test the connection by making a simple QuickBooks API call (CompanyInfo)
  try {
    const testUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${connection.realm_id}/companyinfo/${connection.realm_id}`;
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Accept': 'application/json',
      }
    });

    if (!testResponse.ok) {
      if (testResponse.status === 401 || testResponse.status === 403) {
        // Token expired, try to refresh
        console.log('Token expired, attempting refresh...');
        const refreshed = await refreshQuickBooksToken(connection.refresh_token);
        
        // Use service role key for server-side operations
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase configuration missing for token update');
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error: updateError } = await supabase
          .from('quickbooks_connections')
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            last_refreshed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);
          
        if (updateError) {
          console.error('Failed to update refreshed tokens:', updateError);
          throw new Error('Failed to update refreshed tokens');
        }
        
        console.log('✅ Token refreshed successfully');
        
        // Update usage
        await updateConnectionUsage(connection.id);
        
        // Return updated connection
        return {
          ...connection,
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
        };
      } else {
        throw new Error(`Connection test failed: ${testResponse.status} ${testResponse.statusText}`);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('TOKEN_EXPIRED_REFRESH_FAILED')) {
      // Mark connection as inactive
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from('quickbooks_connections')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id);
      }
    }
    throw error;
  }

  // Connection is valid, update usage
  await updateConnectionUsage(connection.id);
  return connection;
}

// Helper to refresh QuickBooks tokens
async function refreshQuickBooksToken(refreshToken: string) {
  // Make the refresh call directly to QuickBooks
  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('QuickBooks client credentials not configured');
  }
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: body.toString()
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token refresh failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`TOKEN_EXPIRED_REFRESH_FAILED`);
  }
  
  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken // Some refresh responses don't include new refresh token
  };
}

// Check if user has admin role for a company
export async function isUserCompanyAdmin(userId: string, companyId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_company_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single();
    
  if (error) {
    console.error('Error checking user role:', error);
    return false;
  }
  
  return data?.role === 'admin';
}

// Add a user to a company (admin function)
export async function addUserToCompany(
  userEmail: string,
  companyId: string,
  role: 'admin' | 'viewer' = 'viewer'
): Promise<void> {
  const supabase = getSupabaseClient();
  
  // First, find the user by email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', userEmail)
    .single();
    
  if (userError) {
    throw new Error(`User with email ${userEmail} not found`);
  }
  
  // Add user to company
  const { error } = await supabase
    .from('user_company_roles')
    .insert({
      user_id: user.id,
      company_id: companyId,
      role
    });
    
  if (error) {
    console.error('Error adding user to company:', error);
    throw new Error('Failed to add user to company');
  }
}