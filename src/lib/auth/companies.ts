import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from './config';

export interface Company {
  id: string;
  quickbooks_realm_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserCompanyRole {
  user_id: string;
  company_id: string;
  role: 'admin' | 'viewer';
  created_at: string;
  company: Company;
}

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Get companies that the current user has access to
export async function getUserCompanies(userId?: string): Promise<UserCompanyRole[]> {
  const supabase = getSupabaseServiceClient();
  
  // If no userId provided, get from session
  let targetUserId = userId;
  if (!targetUserId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return [];
    }
    targetUserId = session.user.dbId;
  }

  // First get user roles
  const { data: roles, error: roleError } = await supabase
    .from('user_company_roles')
    .select('user_id, company_id, role, created_at')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (roleError) {
    console.error('Error fetching user roles:', roleError);
    return [];
  }

  if (!roles || roles.length === 0) {
    return [];
  }

  // Get company details for each role
  const companyIds = roles.map(role => role.company_id);
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .in('id', companyIds);

  if (companyError) {
    console.error('Error fetching companies:', companyError);
    return [];
  }

  // Combine roles with company data
  return roles.map(role => {
    const company = companies?.find(c => c.id === role.company_id);
    return {
      ...role,
      company: company!
    };
  }).filter(item => item.company); // Filter out any roles without matching companies
}

// Get a specific company by ID (with permission check)
export async function getCompanyById(companyId: string, userId?: string): Promise<Company | null> {
  const supabase = getSupabaseServiceClient();
  
  // If no userId provided, get from session
  let targetUserId = userId;
  if (!targetUserId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return null;
    }
    targetUserId = session.user.dbId;
  }

  // Check if user has access to this company
  const { data: roleData, error: roleError } = await supabase
    .from('user_company_roles')
    .select('role')
    .eq('user_id', targetUserId)
    .eq('company_id', companyId)
    .single();

  if (roleError || !roleData) {
    console.error('User does not have access to company:', companyId);
    return null;
  }

  // Fetch company details
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (companyError) {
    console.error('Error fetching company:', companyError);
    return null;
  }

  return company;
}

// Create a new company (typically from QuickBooks OAuth)
export async function createCompany(
  quickbooksRealmId: string,
  companyName: string,
  adminUserId: string
): Promise<Company | null> {
  console.log('=== CREATE COMPANY START ===');
  console.log('Parameters:', { quickbooksRealmId, companyName, adminUserId });
  
  const supabase = getSupabaseServiceClient();
  console.log('✅ Supabase service client created');

  try {
    // Check if company already exists
    console.log('Checking for existing company with realm ID:', quickbooksRealmId);
    const { data: existingCompany, error: existingError } = await supabase
      .from('companies')
      .select('*')
      .eq('quickbooks_realm_id', quickbooksRealmId)
      .single();
      
    console.log('Existing company check result:', {
      found: !!existingCompany,
      error: existingError?.message,
      errorCode: existingError?.code,
      companyId: existingCompany?.id
    });

    let company: Company;

    if (existingCompany) {
      console.log('✅ Using existing company:', existingCompany.id);
      company = existingCompany;
    } else {
      // Create new company
      console.log('Creating new company record...');
      const companyData = {
        quickbooks_realm_id: quickbooksRealmId,
        name: companyName,
      };
      console.log('Company insert data:', companyData);
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert(companyData)
        .select()
        .single();

      if (companyError) {
        console.error('❌ ERROR CREATING COMPANY:', companyError);
        console.error('Company error details:', {
          message: companyError.message,
          code: companyError.code,
          details: companyError.details,
          hint: companyError.hint
        });
        return null;
      }

      console.log('✅ New company created:', {
        id: newCompany.id,
        name: newCompany.name,
        quickbooks_realm_id: newCompany.quickbooks_realm_id
      });
      company = newCompany;
    }

    // Grant admin role to the user
    console.log('Granting admin role to user...');
    const roleData = {
      user_id: adminUserId,
      company_id: company.id,
      role: 'admin' as const,
    };
    console.log('Role upsert data:', roleData);
    
    const { data: roleResult, error: roleError } = await supabase
      .from('user_company_roles')
      .upsert(roleData, {
        onConflict: 'user_id,company_id'
      })
      .select();

    console.log('Role upsert result:', {
      hasData: !!roleResult,
      dataCount: roleResult?.length || 0,
      insertedData: roleResult
    });

    if (roleError) {
      console.error('❌ ERROR GRANTING ADMIN ROLE:', roleError);
      console.error('Role error details:', {
        message: roleError.message,
        code: roleError.code,
        details: roleError.details,
        hint: roleError.hint
      });
      return null;
    }

    console.log('✅ Admin role granted successfully');
    console.log('=== CREATE COMPANY SUCCESS ===');
    return company;
    
  } catch (error) {
    console.error('=== CREATE COMPANY FAILED ===');
    console.error('Unexpected error in createCompany:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return null;
  }
}

// Check if user has admin access to a company
export async function isCompanyAdmin(companyId: string, userId?: string): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  
  // If no userId provided, get from session
  let targetUserId = userId;
  if (!targetUserId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return false;
    }
    targetUserId = session.user.dbId;
  }

  const { data, error } = await supabase
    .from('user_company_roles')
    .select('role')
    .eq('user_id', targetUserId)
    .eq('company_id', companyId)
    .eq('role', 'admin')
    .single();

  return !error && !!data;
}

// Grant access to a company
export async function grantCompanyAccess(
  companyId: string,
  userId: string,
  role: 'admin' | 'viewer',
  grantedByUserId: string
): Promise<boolean> {
  const supabase = getSupabaseServiceClient();

  try {
    // Verify the granter has admin access
    const isAdmin = await isCompanyAdmin(companyId, grantedByUserId);
    if (!isAdmin) {
      console.error('User does not have admin access to grant permissions');
      return false;
    }

    const { error } = await supabase
      .from('user_company_roles')
      .upsert({
        user_id: userId,
        company_id: companyId,
        role,
      }, {
        onConflict: 'user_id,company_id'
      });

    if (error) {
      console.error('Error granting company access:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in grantCompanyAccess:', error);
    return false;
  }
}