import { createClient } from '@supabase/supabase-js';

export interface AccessRequest {
  id: number;
  user_id: string;
  user_email?: string;
  user_name?: string;
  company_id: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'denied';
  approved_by?: string;
  approved_at?: string;
  denied_by?: string;
  denied_at?: string;
  reason?: string;
}

export interface UserPermission {
  id: number;
  user_id: string;
  user_email?: string;
  user_name?: string;
  company_id: string;
  granted_by: string;
  granted_at: string;
  is_active: boolean;
  last_accessed?: string;
}

// Create a singleton Supabase client
let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are missing');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

// Generate a unique user ID
function getUserId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let userId = localStorage.getItem('qb_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem('qb_user_id', userId);
  }
  return userId;
}

function getCompanyId(): string {
  return 'default_company';
}

// Request access for a user
export async function createAccessRequest(userEmail?: string, userName?: string): Promise<AccessRequest> {
  const supabase = getSupabaseClient();
  const userId = getUserId();
  const companyId = getCompanyId();

  // Check if user already has an active request
  const { data: existingRequest } = await supabase
    .from('access_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .single();

  if (existingRequest) {
    return existingRequest;
  }

  const { data, error } = await supabase
    .from('access_requests')
    .insert({
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      company_id: companyId,
      status: 'pending',
      requested_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating access request:', error);
    throw new Error('Failed to create access request');
  }

  return data;
}

// Get pending access requests (for admins)
export async function getPendingAccessRequests(): Promise<AccessRequest[]> {
  const supabase = getSupabaseClient();
  const companyId = getCompanyId();

  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending access requests:', error);
    return [];
  }

  return data || [];
}

// Approve access request
export async function approveAccessRequest(requestId: number, adminUserId?: string): Promise<void> {
  const supabase = getSupabaseClient();
  const adminId = adminUserId || getUserId();

  // Get the request details
  const { data: request, error: fetchError } = await supabase
    .from('access_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw new Error('Access request not found');
  }

  // Update the request status
  const { error: updateError } = await supabase
    .from('access_requests')
    .update({
      status: 'approved',
      approved_by: adminId,
      approved_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error approving access request:', updateError);
    throw new Error('Failed to approve access request');
  }

  // Create user permission
  const { error: permissionError } = await supabase
    .from('user_permissions')
    .upsert({
      user_id: request.user_id,
      user_email: request.user_email,
      user_name: request.user_name,
      company_id: request.company_id,
      granted_by: adminId,
      granted_at: new Date().toISOString(),
      is_active: true
    }, {
      onConflict: 'user_id,company_id'
    });

  if (permissionError) {
    console.error('Error creating user permission:', permissionError);
    throw new Error('Failed to create user permission');
  }
}

// Deny access request
export async function denyAccessRequest(requestId: number, reason?: string, adminUserId?: string): Promise<void> {
  const supabase = getSupabaseClient();
  const adminId = adminUserId || getUserId();

  const { error } = await supabase
    .from('access_requests')
    .update({
      status: 'denied',
      denied_by: adminId,
      denied_at: new Date().toISOString(),
      reason: reason
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error denying access request:', error);
    throw new Error('Failed to deny access request');
  }
}

// Check if user has permission
export async function checkUserPermission(userId?: string): Promise<UserPermission | null> {
  const supabase = getSupabaseClient();
  const checkUserId = userId || getUserId();
  const companyId = getCompanyId();

  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', checkUserId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking user permission:', error);
    return null;
  }

  return data || null;
}

// Get all user permissions (for admin view)
export async function getAllUserPermissions(): Promise<UserPermission[]> {
  const supabase = getSupabaseClient();
  const companyId = getCompanyId();

  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('granted_at', { ascending: false });

  if (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }

  return data || [];
}

// Revoke user permission
export async function revokeUserPermission(userId: string, adminUserId?: string): Promise<void> {
  const supabase = getSupabaseClient();
  const companyId = getCompanyId();

  const { error } = await supabase
    .from('user_permissions')
    .update({
      is_active: false
    })
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (error) {
    console.error('Error revoking user permission:', error);
    throw new Error('Failed to revoke user permission');
  }
}

// Update last accessed time for user permission
export async function updateLastAccessed(userId?: string): Promise<void> {
  const supabase = getSupabaseClient();
  const checkUserId = userId || getUserId();
  const companyId = getCompanyId();

  const { error } = await supabase
    .from('user_permissions')
    .update({
      last_accessed: new Date().toISOString()
    })
    .eq('user_id', checkUserId)
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) {
    console.error('Error updating last accessed:', error);
  }
}

// Check if user is admin (has a direct QuickBooks connection or is explicitly marked as admin)
export async function isUserAdmin(userId?: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const checkUserId = userId || getUserId();
  const companyId = getCompanyId();

  // Check if user has a direct QuickBooks connection (makes them admin)
  const { data: connections } = await supabase
    .from('quickbooks_connections')
    .select('id')
    .eq('user_id', checkUserId)
    .eq('company_id', companyId)
    .eq('is_active', true);

  return (connections?.length || 0) > 0;
}