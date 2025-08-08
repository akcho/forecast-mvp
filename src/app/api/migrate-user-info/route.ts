import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { QuickBooksClient } from '@/lib/quickbooks/client';

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
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.');
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

    const data = await response.json();
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

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch all active connections that need migration
    const { data: connections, error: fetchError } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      throw new Error(`Failed to fetch connections: ${fetchError.message}`);
    }
    
    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active connections found to migrate',
        migrated: 0
      });
    }
    
    const results = {
      total: connections.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };
    
    // Process each connection
    for (const connection of connections) {
      const result = {
        id: connection.id,
        realm_id: connection.realm_id,
        status: 'processing'
      };
      
      try {
        // Skip if already has user info
        if (connection.user_email && connection.user_name) {
          result.status = 'skipped - already has user info';
          results.skipped++;
        } else {
          // Fetch user information
          const userInfo = await fetchUserInfo(connection.access_token);
          let userName: string | null = null;
          let userEmail: string | null = null;
          
          if (userInfo) {
            userName = `${userInfo.givenName || ''} ${userInfo.familyName || ''}`.trim() || null;
            userEmail = userInfo.email || null;
          }
          
          // Fetch company information if not available
          let companyName = connection.company_name;
          if (!companyName) {
            companyName = await fetchCompanyInfo(connection.access_token, connection.realm_id);
          }
          
          // Update the connection
          const updateData: any = {
            updated_at: new Date().toISOString()
          };
          
          if (userEmail) updateData.user_email = userEmail;
          if (userName) updateData.user_name = userName;
          if (companyName && !connection.company_name) updateData.company_name = companyName;
          
          const { error: updateError } = await supabase
            .from('quickbooks_connections')
            .update(updateData)
            .eq('id', connection.id);
          
          if (updateError) {
            throw updateError;
          }
          
          result.status = `migrated - ${userName || 'unknown user'} (${userEmail || 'no email'})`;
          results.migrated++;
        }
      } catch (error) {
        result.status = `error - ${error instanceof Error ? error.message : 'unknown error'}`;
        results.errors++;
      }
      
      results.details.push(result);
      
      // Small delay to be nice to the APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return NextResponse.json({
      success: true,
      message: `Migration completed: ${results.migrated} migrated, ${results.skipped} skipped, ${results.errors} errors`,
      results
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}