import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from './config';

export interface Company {
  id: string;
  quickbooks_realm_id: string;
  name: string;
  created_at: string;
}

export interface UserCompanyRole {
  user_id: string;
  company_id: string;
  role: 'admin' | 'viewer';
  created_at: string;
  company: Company;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Get companies that the current user has access to
export async function getUserCompanies(userId?: string): Promise<UserCompanyRole[]> {
  const supabase = getSupabaseClient();
  
  // If no userId provided, get from session
  let targetUserId = userId;
  if (!targetUserId) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return [];
    }
    targetUserId = session.user.dbId;
  }

  const { data, error } = await supabase
    .from('user_company_roles')
    .select(`
      user_id,
      company_id,
      role,
      created_at,
      company:companies (
        id,
        quickbooks_realm_id,
        name,
        created_at
      )
    `)
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user companies:', error);
    return [];
  }

  return data || [];
}

// Get a specific company by ID (with permission check)
export async function getCompanyById(companyId: string, userId?: string): Promise<Company | null> {
  const supabase = getSupabaseClient();
  
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
  const supabase = getSupabaseClient();

  try {
    // Check if company already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('quickbooks_realm_id', quickbooksRealmId)
      .single();

    let company: Company;

    if (existingCompany) {
      company = existingCompany;
    } else {
      // Create new company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          quickbooks_realm_id: quickbooksRealmId,
          name: companyName,
        })
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        return null;
      }

      company = newCompany;
    }

    // Grant admin role to the user
    const { error: roleError } = await supabase
      .from('user_company_roles')
      .upsert({
        user_id: adminUserId,
        company_id: company.id,
        role: 'admin',
      }, {
        onConflict: 'user_id,company_id'
      });

    if (roleError) {
      console.error('Error granting admin role:', roleError);
      return null;
    }

    return company;
  } catch (error) {
    console.error('Error in createCompany:', error);
    return null;
  }
}

// Check if user has admin access to a company
export async function isCompanyAdmin(companyId: string, userId?: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
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
  const supabase = getSupabaseClient();

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