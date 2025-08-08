import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './config';
import { getCompanyById, isCompanyAdmin } from './companies';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export interface AuthContext {
  userId: string;
  companyId: string;
  isAdmin: boolean;
  company: {
    id: string;
    quickbooks_realm_id: string;
    name: string;
    created_at: string;
  };
}

// Middleware to validate user authentication and company access
export async function validateAuth(
  request: NextRequest,
  requiredCompanyId?: string
): Promise<{ success: true; context: AuthContext } | { success: false; error: string; status: number }> {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return {
        success: false,
        error: 'Not authenticated',
        status: 401
      };
    }

    // Get company ID from request (header or query param only)
    let companyId = requiredCompanyId;
    
    if (!companyId) {
      // Try to get from X-Company-ID header
      companyId = request.headers.get('X-Company-ID') || undefined;
      
      // Try to get from query params
      if (!companyId) {
        const url = new URL(request.url);
        companyId = url.searchParams.get('company_id') || undefined;
      }
    }

    if (!companyId) {
      return {
        success: false,
        error: 'Company ID is required (pass via X-Company-ID header or company_id query param)',
        status: 400
      };
    }

    // Validate company access
    const company = await getCompanyById(companyId, session.user.dbId);
    if (!company) {
      return {
        success: false,
        error: 'Company not found or access denied',
        status: 403
      };
    }

    // Check if user is admin for this company
    const isAdmin = await isCompanyAdmin(companyId, session.user.dbId);

    return {
      success: true,
      context: {
        userId: session.user.dbId,
        companyId,
        isAdmin,
        company
      }
    };
  } catch (error) {
    console.error('Auth validation error:', error);
    return {
      success: false,
      error: 'Internal server error',
      status: 500
    };
  }
}

// Get QuickBooks connection for a company with proper validation
export async function getValidatedQBConnection(
  companyId: string,
  userId: string
): Promise<{ 
  success: true; 
  connection: {
    id: number;
    access_token: string;
    refresh_token: string;
    realm_id: string;
    company_name: string;
  }
} | { 
  success: false; 
  error: string; 
}> {
  try {
    const supabase = getSupabaseClient();

    // Verify user has access to this company
    const company = await getCompanyById(companyId, userId);
    if (!company) {
      return {
        success: false,
        error: 'Company not found or access denied'
      };
    }

    // Get the QuickBooks connection for this company
    const { data: connection, error } = await supabase
      .from('quickbooks_connections')
      .select('id, access_token, refresh_token, realm_id, company_name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single();

    if (error || !connection) {
      console.error('QB connection query error:', error);
      return {
        success: false,
        error: 'QuickBooks connection not found'
      };
    }

    return {
      success: true,
      connection
    };
  } catch (error) {
    console.error('Error getting validated QB connection:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

// Wrapper for API routes that require company validation
export function withCompanyValidation<T>(
  handler: (request: NextRequest, context: AuthContext) => Promise<T>
) {
  return async (request: NextRequest): Promise<T | Response> => {
    const validation = await validateAuth(request);
    
    if (!validation.success) {
      return new Response(JSON.stringify({
        success: false,
        error: validation.error
      }), {
        status: validation.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      return await handler(request, validation.context);
    } catch (error) {
      console.error('API handler error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}