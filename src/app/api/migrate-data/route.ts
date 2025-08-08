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
    
    console.log('🔄 Starting data migration for existing QB connections...');
    
    // Get all existing QuickBooks connections that don't have company_id set
    const { data: connections, error: fetchError } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .is('company_id', null)
      .eq('is_active', true);
    
    if (fetchError) {
      throw new Error(`Failed to fetch connections: ${fetchError.message}`);
    }
    
    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No connections need migration',
        migrated: 0
      });
    }
    
    console.log(`Found ${connections.length} connections to migrate`);
    
    const results = [];
    
    for (const connection of connections) {
      try {
        console.log(`Migrating connection ${connection.id} for realm ${connection.realm_id}`);
        
        // First, try to fetch company name from QuickBooks
        let companyName = connection.company_name || `Company ${connection.realm_id}`;
        
        // Try to get company info from QuickBooks API
        try {
          const companyInfoResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${connection.realm_id}/companyinfo/${connection.realm_id}?minorversion=65`, {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Accept': 'application/json',
            }
          });
          
          if (companyInfoResponse.ok) {
            const companyData = await companyInfoResponse.json();
            const companyInfo = companyData?.QueryResponse?.CompanyInfo?.[0];
            if (companyInfo?.CompanyName) {
              companyName = companyInfo.CompanyName;
              console.log(`  ✓ Fetched company name: ${companyName}`);
            }
          }
        } catch (error) {
          console.warn(`  ⚠ Could not fetch company name for realm ${connection.realm_id}:`, error);
        }
        
        // Check if company already exists
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('*')
          .eq('quickbooks_realm_id', connection.realm_id)
          .single();
        
        let company;
        
        if (existingCompany) {
          company = existingCompany;
          console.log(`  ✓ Using existing company: ${company.name}`);
        } else {
          // Create new company
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({
              quickbooks_realm_id: connection.realm_id,
              name: companyName
            })
            .select()
            .single();
          
          if (companyError) {
            throw new Error(`Failed to create company: ${companyError.message}`);
          }
          
          company = newCompany;
          console.log(`  ✓ Created new company: ${company.name}`);
        }
        
        // Update the QB connection with company_id
        const { error: updateError } = await supabase
          .from('quickbooks_connections')
          .update({ company_id: company.id })
          .eq('id', connection.id);
        
        if (updateError) {
          throw new Error(`Failed to update connection: ${updateError.message}`);
        }
        
        console.log(`  ✓ Updated connection ${connection.id} with company_id ${company.id}`);
        
        results.push({
          connection_id: connection.id,
          company_id: company.id,
          company_name: company.name,
          realm_id: connection.realm_id,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`  ✗ Error migrating connection ${connection.id}:`, error);
        results.push({
          connection_id: connection.id,
          realm_id: connection.realm_id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`✅ Data migration completed! ${successCount} successful, ${errorCount} errors`);
    
    return NextResponse.json({
      success: true,
      message: `Data migration completed`,
      migrated: successCount,
      errors: errorCount,
      results
    });
    
  } catch (error) {
    console.error('Data migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}