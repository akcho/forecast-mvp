import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { isCompanyAdmin } from '@/lib/auth/companies';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Get users for a company (admin only)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Check if user is admin of this company
    const isAdmin = await isCompanyAdmin(companyId, session.user.dbId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = getSupabaseServiceClient();
    
    // Get all users for this company
    const { data, error } = await supabase
      .from('user_company_roles')
      .select(`
        role,
        created_at,
        users:user_id (
          id,
          email,
          name,
          avatar_url,
          created_at
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching company users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const users = data?.map(item => ({
      ...item.users,
      role: item.role,
      joined_at: item.created_at
    })) || [];

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add user to company (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { email, companyId, role = 'viewer' } = body;

    if (!email || !companyId) {
      return NextResponse.json({ 
        error: 'Email and company ID are required' 
      }, { status: 400 });
    }

    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json({ 
        error: 'Role must be admin or viewer' 
      }, { status: 400 });
    }

    // Check if user is admin of this company
    const isAdmin = await isCompanyAdmin(companyId, session.user.dbId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = getSupabaseServiceClient();
    
    // Find the user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      return NextResponse.json({ 
        error: `User with email ${email} not found. They need to sign up first with Google OAuth.` 
      }, { status: 404 });
    }

    // Check if user already has access to this company
    const { data: existingRole } = await supabase
      .from('user_company_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .single();

    if (existingRole) {
      // Update existing role
      const { error: updateError } = await supabase
        .from('user_company_roles')
        .update({ role })
        .eq('user_id', user.id)
        .eq('company_id', companyId);

      if (updateError) {
        console.error('Error updating user role:', updateError);
        return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Updated ${user.email} role to ${role}`,
        user: { ...user, role }
      });
    } else {
      // Add new user to company
      const { error: insertError } = await supabase
        .from('user_company_roles')
        .insert({
          user_id: user.id,
          company_id: companyId,
          role
        });

      if (insertError) {
        console.error('Error adding user to company:', insertError);
        return NextResponse.json({ error: 'Failed to add user to company' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Added ${user.email} to company as ${role}`,
        user: { ...user, role }
      });
    }

  } catch (error) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove user from company (admin only)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const companyId = searchParams.get('company_id');

    if (!userId || !companyId) {
      return NextResponse.json({ 
        error: 'User ID and company ID are required' 
      }, { status: 400 });
    }

    // Check if requesting user is admin of this company
    const isAdmin = await isCompanyAdmin(companyId, session.user.dbId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Don't allow removing themselves
    if (userId === session.user.dbId) {
      return NextResponse.json({ 
        error: 'Cannot remove yourself from the company' 
      }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    
    const { error } = await supabase
      .from('user_company_roles')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error removing user from company:', error);
      return NextResponse.json({ error: 'Failed to remove user from company' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User removed from company' });

  } catch (error) {
    console.error('Error in DELETE /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}