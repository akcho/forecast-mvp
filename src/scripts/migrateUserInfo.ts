#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

// Script to migrate existing QuickBooks connections to include user information

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

interface QuickBooksUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  address?: {
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}

interface QuickBooksCompanyInfo {
  QueryResponse: {
    CompanyInfo: Array<{
      CompanyName: string;
      LegalName: string;
      CompanyAddr?: {
        Line1?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
      };
      Email?: {
        Address?: string;
      };
      WebAddr?: {
        URI?: string;
      };
    }>;
  };
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Environment check:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseKey,
    supabaseUrl: supabaseUrl?.substring(0, 30) + '...',
    availableEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  });
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are missing. Please check your environment variables.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function fetchUserInfo(accessToken: string): Promise<QuickBooksUserInfo | null> {
  try {
    const response = await fetch('https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch user info: ${response.status} ${response.statusText}`);
      return null;
    }

    const userInfo = await response.json();
    return userInfo as QuickBooksUserInfo;
  } catch (error) {
    console.warn('Error fetching user info:', error);
    return null;
  }
}

async function fetchCompanyInfo(accessToken: string, realmId: string): Promise<string | null> {
  try {
    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch company info: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: QuickBooksCompanyInfo = await response.json();
    const companyInfo = data?.QueryResponse?.CompanyInfo?.[0];
    
    if (!companyInfo) {
      console.warn('No company info in response');
      return null;
    }

    return companyInfo.CompanyName || companyInfo.LegalName || null;
  } catch (error) {
    console.warn('Error fetching company info:', error);
    return null;
  }
}

async function migrateConnection(connection: QuickBooksConnection): Promise<void> {
  const supabase = getSupabaseClient();
  
  console.log(`\nMigrating connection ${connection.id} (Realm: ${connection.realm_id})`);
  
  // Skip if already has user info
  if (connection.user_email && connection.user_name) {
    console.log('  ✓ Already has user info, skipping');
    return;
  }
  
  // Fetch user information
  const userInfo = await fetchUserInfo(connection.access_token);
  let userName: string | null = null;
  let userEmail: string | null = null;
  
  if (userInfo) {
    userName = `${userInfo.givenName || ''} ${userInfo.familyName || ''}`.trim() || null;
    userEmail = userInfo.email || null;
    console.log(`  ✓ Fetched user info: ${userName} (${userEmail})`);
  } else {
    console.log('  ⚠ Could not fetch user info');
  }
  
  // Fetch company information if not available
  let companyName = connection.company_name;
  if (!companyName) {
    companyName = await fetchCompanyInfo(connection.access_token, connection.realm_id);
    if (companyName) {
      console.log(`  ✓ Fetched company name: ${companyName}`);
    } else {
      console.log('  ⚠ Could not fetch company name');
    }
  }
  
  // Update the connection
  const updateData: any = {
    updated_at: new Date().toISOString()
  };
  
  if (userEmail) updateData.user_email = userEmail;
  if (userName) updateData.user_name = userName;
  if (companyName && !connection.company_name) updateData.company_name = companyName;
  
  const { error } = await supabase
    .from('quickbooks_connections')
    .update(updateData)
    .eq('id', connection.id);
  
  if (error) {
    console.error(`  ✗ Error updating connection:`, error);
  } else {
    console.log('  ✓ Connection updated successfully');
  }
}

async function main() {
  try {
    console.log('🚀 Starting QuickBooks connection migration...\n');
    
    const supabase = getSupabaseClient();
    
    // Fetch all active connections
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
    
    console.log(`Found ${connections.length} active connections to migrate\n`);
    
    // Process connections one by one to avoid rate limiting
    for (const connection of connections) {
      await migrateConnection(connection);
      // Small delay to be nice to the APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();