import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing FinancialDataParser with monthly P&L data...');
    
    // Check authentication
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

    // Get monthly P&L data (last 12 months for comprehensive test)
    console.log('📊 Fetching 12-month P&L data...');
    const monthlyPnLData = await qbAPI.getMonthlyProfitAndLoss(12);
    
    // Parse the data with our new parser
    console.log('🔄 Parsing data with FinancialDataParser...');
    const parser = new FinancialDataParser();
    const parsedData = parser.parseMonthlyProfitLoss(monthlyPnLData);

    // Test current month actuals
    console.log('📈 Fetching current month actuals...');
    const currentMonth = await qbAPI.getCurrentMonthActuals();

    return NextResponse.json({
      success: true,
      test: 'FinancialDataParser validation',
      rawDataInfo: {
        reportName: monthlyPnLData.Header?.ReportName,
        period: `${monthlyPnLData.Header?.StartPeriod} to ${monthlyPnLData.Header?.EndPeriod}`,
        columnsCount: monthlyPnLData.Columns?.Column?.length || 0,
        columnTitles: monthlyPnLData.Columns?.Column?.map(c => c.ColTitle) || [],
        summarizeBy: monthlyPnLData.Header?.SummarizeColumnsBy
      },
      parsedData: {
        period: parsedData.period,
        revenue: {
          linesCount: parsedData.revenue.lines.length,
          monthlyTotals: parsedData.revenue.monthlyTotals,
          grandTotal: parsedData.revenue.grandTotal,
          sampleLines: parsedData.revenue.lines.slice(0, 3) // First 3 revenue lines for preview
        },
        expenses: {
          linesCount: parsedData.expenses.lines.length,
          monthlyTotals: parsedData.expenses.monthlyTotals,
          grandTotal: parsedData.expenses.grandTotal,
          sampleLines: parsedData.expenses.lines.slice(0, 3) // First 3 expense lines for preview
        },
        netIncome: parsedData.netIncome,
        metadata: parsedData.metadata
      },
      currentMonthActuals: {
        hasData: !!currentMonth.Header,
        period: `${currentMonth.Header?.StartPeriod} to ${currentMonth.Header?.EndPeriod}`,
        reportBasis: currentMonth.Header?.ReportBasis
      },
      validation: {
        monthsWithData: parsedData.period.months.length,
        revenueVsExpense: {
          revenueTotal: parsedData.revenue.grandTotal,
          expenseTotal: parsedData.expenses.grandTotal,
          netIncome: parsedData.netIncome.total,
          calculationCheck: parsedData.revenue.grandTotal - parsedData.expenses.grandTotal === parsedData.netIncome.total
        }
      }
    });

  } catch (error) {
    console.error('❌ Parser test failed:', error);
    return NextResponse.json({ 
      error: 'Parser test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}