import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';
import { TrendAnalyzer } from '@/lib/services/TrendAnalyzer';
import { ForecastEngine } from '@/lib/services/ForecastEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing ForecastEngine with 3-scenario forecasting...');
    
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

    // Get historical data for forecasting
    console.log('📊 Fetching historical data for forecasting...');
    const monthlyPnLData = await qbAPI.getMonthlyProfitAndLoss(12);
    
    // Parse historical data
    console.log('🔄 Parsing historical P&L data...');
    const parser = new FinancialDataParser();
    const parsedData = parser.parseMonthlyProfitLoss(monthlyPnLData);
    
    // Analyze trends and expenses
    console.log('📈 Analyzing trends for forecasting inputs...');
    const trendAnalyzer = new TrendAnalyzer();
    const revenueTrends = trendAnalyzer.analyzeRevenueTrends(parsedData);
    const expenseBreakdown = trendAnalyzer.analyzeExpenseStructure(parsedData);
    
    // Generate 3-scenario forecast
    console.log('🔮 Generating 3-scenario forecast...');
    const forecastEngine = new ForecastEngine();
    const forecasts = forecastEngine.generateThreeScenarioForecast(
      parsedData,
      revenueTrends,
      expenseBreakdown,
      12 // 12-month forecast
    );

    return NextResponse.json({
      success: true,
      test: '3-Scenario Forecast Engine Validation',
      historicalBase: {
        period: parsedData.period,
        lastMonthRevenue: parsedData.revenue.monthlyTotals[parsedData.revenue.monthlyTotals.length - 1]?.value,
        totalHistoricalRevenue: parsedData.revenue.grandTotal,
        totalHistoricalExpenses: parsedData.expenses.grandTotal,
        historicalNetIncome: parsedData.netIncome.total
      },
      trendInputs: {
        recommendedGrowthRate: revenueTrends.recommendedGrowthRate,
        seasonalityScore: revenueTrends.seasonalityScore,
        volatilityScore: revenueTrends.volatilityScore,
        confidenceLevel: revenueTrends.confidenceLevel,
        peakMonths: revenueTrends.peakMonths,
        lowMonths: revenueTrends.lowMonths
      },
      expenseInputs: {
        variableCostRatio: expenseBreakdown.variableCosts.asPercentOfRevenue,
        fixedCostBase: expenseBreakdown.fixedCosts.monthlyAverage,
        fixedCostAccounts: expenseBreakdown.fixedCosts.accounts.length,
        variableCostAccounts: expenseBreakdown.variableCosts.accounts.length
      },
      forecastScenarios: forecasts.map(forecast => ({
        scenario: forecast.scenario,
        assumptions: {
          monthlyGrowthRate: forecast.assumptions.monthlyGrowthRate,
          variableCostRatio: forecast.assumptions.variableCostRatio,
          fixedCostInflation: forecast.assumptions.fixedCostInflation,
          marketConditions: forecast.assumptions.marketConditions,
          confidenceLevel: forecast.assumptions.confidenceLevel,
          sampleSeasonalAdjustments: {
            Apr: forecast.assumptions.seasonalAdjustments.Apr,
            May: forecast.assumptions.seasonalAdjustments.May,
            Dec: forecast.assumptions.seasonalAdjustments.Dec
          }
        },
        summary: forecast.summary,
        sampleProjections: forecast.projections.slice(0, 3) // First 3 months
      })),
      scenarioComparison: {
        baseline: {
          totalRevenue: forecasts.find(f => f.scenario === 'baseline')?.summary.totalProjectedRevenue,
          totalNetIncome: forecasts.find(f => f.scenario === 'baseline')?.summary.totalNetIncome
        },
        growth: {
          totalRevenue: forecasts.find(f => f.scenario === 'growth')?.summary.totalProjectedRevenue,
          totalNetIncome: forecasts.find(f => f.scenario === 'growth')?.summary.totalNetIncome
        },
        downturn: {
          totalRevenue: forecasts.find(f => f.scenario === 'downturn')?.summary.totalProjectedRevenue,
          totalNetIncome: forecasts.find(f => f.scenario === 'downturn')?.summary.totalNetIncome
        }
      },
      readinessForNextPhase: {
        forecastEngineWorking: forecasts.length === 3,
        scenariosGenerated: forecasts.every(f => f.projections.length === 12),
        growthAssumptionsApplied: forecasts.some(f => f.assumptions.monthlyGrowthRate !== 0),
        seasonalityIncorporated: forecasts.some(f => Object.keys(f.assumptions.seasonalAdjustments).length > 0),
        readyForExpenseCategorization: true
      }
    });

  } catch (error) {
    console.error('❌ ForecastEngine test failed:', error);
    return NextResponse.json({ 
      error: 'ForecastEngine test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}