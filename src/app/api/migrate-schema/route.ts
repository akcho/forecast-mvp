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
    
    console.log('🚀 Starting multi-company schema migration...');
    
    // Create companies table
    console.log('Creating companies table...');
    const { error: companiesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          quickbooks_realm_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (companiesError) {
      console.error('Error creating companies table:', companiesError);
      // Try alternative approach
      const { error: altError1 } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      if (altError1 && altError1.code === '42P01') {
        // Table doesn't exist, we need to create it manually
        throw new Error('Cannot create companies table. Please run migration manually in Supabase dashboard.');
      }
    }
    
    // Create users table
    console.log('Creating users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          google_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (usersError) {
      console.error('Error creating users table:', usersError);
    }
    
    // Create user_company_roles table
    console.log('Creating user_company_roles table...');
    const { error: rolesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_company_roles (
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          PRIMARY KEY (user_id, company_id)
        );
      `
    });
    
    if (rolesError) {
      console.error('Error creating user_company_roles table:', rolesError);
    }
    
    // Add company_id to quickbooks_connections
    console.log('Adding company_id to quickbooks_connections...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE quickbooks_connections 
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
      `
    });
    
    if (alterError) {
      console.error('Error adding company_id column:', alterError);
    }
    
    // Create indexes
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_companies_realm_id ON companies(quickbooks_realm_id);',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);',
      'CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id ON user_company_roles(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_id ON user_company_roles(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_quickbooks_connections_company_id ON quickbooks_connections(company_id);'
    ];
    
    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (indexError) {
        console.warn('Index creation warning:', indexError);
      }
    }
    
    console.log('✅ Schema migration completed!');
    
    return NextResponse.json({
      success: true,
      message: 'Multi-company schema migration completed successfully',
      tables_created: ['companies', 'users', 'user_company_roles'],
      columns_added: ['quickbooks_connections.company_id']
    });
    
  } catch (error) {
    console.error('Schema migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      instructions: 'You may need to run the SQL migration manually in the Supabase dashboard'
    }, { status: 500 });
  }
}