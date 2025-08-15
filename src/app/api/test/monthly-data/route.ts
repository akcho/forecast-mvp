import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing monthly data extraction...');
    
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Get valid connection
    const connection = await getValidConnection(session.user.dbId);
    const qbAPI = new QuickBooksServerAPI(
      connection.access_token,
      connection.refresh_token,
      connection.realm_id
    );

    // Test 1: Get monthly historical data (last 12 months)
    console.log('📊 Testing monthly historical data...');
    const monthlyData = await qbAPI.getMonthlyProfitAndLoss(12);
    
    // Test 2: Get current month actuals
    console.log('📈 Testing current month actuals...');
    const currentMonth = await qbAPI.getCurrentMonthActuals();

    return NextResponse.json({
      success: true,
      tests: {
        monthlyHistorical: {
          status: 'completed',
          dataPoints: monthlyData.QueryResponse?.Report?.[0]?.Columns?.Column?.length || 0,
          summary: 'Monthly historical P&L data retrieved'
        },
        currentMonthActuals: {
          status: 'completed', 
          hasData: !!currentMonth.QueryResponse?.Report?.[0],
          summary: 'Current month actuals retrieved'
        }
      },
      data: {
        monthlyData: monthlyData,
        currentMonth: currentMonth
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}