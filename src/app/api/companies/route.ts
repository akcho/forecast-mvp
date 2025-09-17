import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getUserCompanies } from '@/lib/auth/companies';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.dbId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const rawCompanies = await getUserCompanies(session.user.dbId);

    // Transform the data structure to match what CompanySwitcher expects
    const companies = rawCompanies.map(item => ({
      company_id: item.company_id,
      company_name: item.company.name,
      role: item.role,
      quickbooks_realm_id: item.company.quickbooks_realm_id
    }));

    return NextResponse.json({
      success: true,
      companies
    });
  } catch (error) {
    console.error('Error fetching user companies:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.dbId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated - please sign in with Google first' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, company_id, role } = body;

    if (action === 'link_current_user_to_company') {
      const supabase = getSupabaseClient();
      
      console.log('Linking user to company:', {
        user_id: session.user.dbId,
        company_id,
        role: role || 'admin'
      });

      // Check if company exists
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', company_id)
        .single();

      if (!company) {
        return NextResponse.json({
          success: false,
          error: 'Company not found'
        }, { status: 404 });
      }

      // Link user to company with admin role (since they connected QB)
      const { data: relationship, error } = await supabase
        .from('user_company_roles')
        .upsert({
          user_id: session.user.dbId,
          company_id: company_id,
          role: role || 'admin'
        }, {
          onConflict: 'user_id,company_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error linking user to company:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to link user to company'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'User successfully linked to company',
        relationship,
        company: company.name,
        user_email: session.user.email
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in companies POST:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}