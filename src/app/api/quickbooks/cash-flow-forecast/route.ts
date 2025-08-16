import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';
import { CashFlowStatementService } from '@/lib/services/CashFlowStatementService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Generating cash flow forecast for Forecast tab...');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const monthsToProject = Math.min(parseInt(searchParams.get('months') || '12'), 24); // Max 24 months
    const includeDetails = searchParams.get('details') === 'true';

    // Get valid connection
    const connection = await getValidConnection(session.user.dbId);
    const qbAPI = new QuickBooksServerAPI(
      connection.access_token,
      connection.refresh_token,
      connection.realm_id
    );

    // Get historical data
    console.log('📈 Fetching historical data for cash flow projections...');
    const [monthlyPnLData, balanceSheetData] = await Promise.all([
      qbAPI.getMonthlyProfitAndLoss(12),
      qbAPI.getBalanceSheet()
    ]);
    
    const parser = new FinancialDataParser();
    const parsedData = parser.parseMonthlyProfitLoss(monthlyPnLData);
    
    // Extract current cash balance
    const currentCashBalance = extractCashBalance(balanceSheetData);
    
    // Generate cash flow projections
    console.log('🔮 Generating comprehensive cash flow projections...');
    const cashFlowService = new CashFlowStatementService();
    const cashFlowProjections = await cashFlowService.generateThreeScenarioCashFlowProjections(
      parsedData,
      currentCashBalance,
      monthsToProject
    );

    // Format response based on detail level
    if (includeDetails) {
      // Full detailed response for admin/debugging
      return NextResponse.json({
        success: true,
        data: {
          currentCashBalance,
          scenarioProjections: cashFlowProjections,
          metadata: {
            monthsProjected: monthsToProject,
            historicalDataPoints: parsedData.revenue.monthlyTotals.length,
            generatedAt: new Date().toISOString(),
            businessType: 'service'
          }
        }
      });
    } else {
      // Simplified response optimized for UI consumption
      return NextResponse.json({
        success: true,
        data: {
          currentCash: currentCashBalance,
          scenarios: cashFlowProjections.map(projection => ({
            scenario: projection.scenario,
            
            // Summary metrics for scenario cards
            summary: {
              endingCash: projection.summary.endingCashPosition,
              totalCashGenerated: projection.summary.totalCashGenerated,
              averageMonthlyCashFlow: projection.summary.averageMonthlyCashFlow,
              operatingCashFlowMargin: projection.summary.operatingCashFlowMargin,
              cashFlowVolatility: projection.summary.cashFlowVolatility,
              monthsOfCashCushion: projection.summary.monthsOfCashCushion,
              riskLevel: projection.summary.negativeCashFlowMonths > 2 ? 'high' : 
                         projection.summary.negativeCashFlowMonths > 0 ? 'medium' : 'low'
            },
            
            // Monthly data for charts
            monthlyData: projection.monthlyProjections.map(month => ({
              month: month.month,
              date: month.date,
              
              // Cash flow components
              operatingCashFlow: month.operatingActivities.netCashFromOperations,
              investingCashFlow: month.investingActivities.netCashFromInvesting,
              financingCashFlow: month.financingActivities.netCashFromFinancing,
              netCashChange: month.cashFlow.netCashChange,
              endingCash: month.cashFlow.endingCash,
              
              // Supporting data for tooltips/details
              revenue: month.supportingData.revenue,
              netIncome: month.operatingActivities.netIncome,
              depreciation: month.operatingActivities.depreciation,
              workingCapitalChange: month.supportingData.workingCapitalChange,
              capitalExpenditures: Math.abs(month.investingActivities.capitalExpenditures),
              
              // Key metrics
              operatingMargin: month.supportingData.operatingMargin,
              cashConversionCycle: month.supportingData.cashConversionCycle
            }))
          })),
          
          // Meta information for UI
          metadata: {
            monthsProjected: monthsToProject,
            generatedAt: new Date().toISOString(),
            dataFreshness: 'real-time'
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Cash flow forecast generation failed:', error);
    
    // Return detailed error information for debugging
    return NextResponse.json({ 
      error: 'Failed to generate cash flow forecast',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: 'FORECAST_GENERATION_FAILED'
    }, { status: 500 });
  }
}

/**
 * Extract current cash balance from QuickBooks balance sheet
 */
function extractCashBalance(balanceSheet: any): number {
  try {
    const report = balanceSheet.QueryResponse?.Report;
    if (!report?.Rows?.Row) return 140000; // Fallback value

    const findBankAccounts = (rows: any[]): number => {
      for (const row of rows) {
        if (row.type === 'Section' && 
            row.Header?.ColData?.[0]?.value === 'Bank Accounts' &&
            row.Summary?.ColData) {
          const value = row.Summary.ColData[1].value.replace(/[^0-9.-]+/g, '');
          return parseFloat(value || '0');
        }
        if (row.Rows?.Row) {
          const result = findBankAccounts(row.Rows.Row);
          if (result > 0) return result;
        }
      }
      return 140000; // Fallback value
    };

    return findBankAccounts(report.Rows.Row);
  } catch (error) {
    console.error('Error extracting cash balance:', error);
    return 140000; // Fallback value
  }
}