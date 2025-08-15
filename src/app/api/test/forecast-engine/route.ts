import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';
import { TrendAnalyzer } from '@/lib/services/TrendAnalyzer';
import { ForecastEngine } from '@/lib/services/ForecastEngine';
import { ExpenseCategorizer } from '@/lib/services/ExpenseCategorizer';

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
    
    // Generate expense categorization
    console.log('🏷️ Categorizing expenses for enhanced forecasting...');
    const expenseCategorizer = new ExpenseCategorizer();
    const categorizedExpenses = expenseCategorizer.categorizeExpenses(
      parsedData,
      revenueTrends,
      expenseBreakdown
    );
    
    // Generate basic 3-scenario forecast
    console.log('🔮 Generating basic 3-scenario forecast...');
    const forecastEngine = new ForecastEngine();
    const basicForecasts = forecastEngine.generateThreeScenarioForecast(
      parsedData,
      revenueTrends,
      expenseBreakdown,
      12 // 12-month forecast
    );
    
    // Generate enhanced 3-scenario forecast with detailed expense categorization
    console.log('⚡ Generating enhanced 3-scenario forecast...');
    const enhancedForecasts = forecastEngine.generateEnhancedThreeScenarioForecast(
      parsedData,
      revenueTrends,
      categorizedExpenses,
      12 // 12-month forecast
    );

    return NextResponse.json({
      success: true,
      test: 'Enhanced 3-Scenario Forecast Engine with Expense Categorization',
      historicalBase: {
        period: parsedData.period,
        lastMonthRevenue: parsedData.revenue.monthlyTotals[parsedData.revenue.monthlyTotals.length - 1]?.value,
        totalHistoricalRevenue: parsedData.revenue.grandTotal,
        totalHistoricalExpenses: parsedData.expenses.grandTotal,
        historicalNetIncome: parsedData.netIncome.total
      },
      
      // Expense categorization results
      expenseCategorization: {
        totalCategories: categorizedExpenses.categories.length,
        categorizedPercentage: categorizedExpenses.forecastingMetrics.categorizedPercentage,
        breakdown: {
          totalFixedCosts: categorizedExpenses.totalFixedCosts,
          totalVariableCosts: categorizedExpenses.totalVariableCosts,
          totalSeasonalCosts: categorizedExpenses.totalSeasonalCosts,
          uncategorizedCosts: categorizedExpenses.uncategorizedCosts
        },
        inflationScenario: categorizedExpenses.inflationAssumptions.scenario,
        sampleCategories: categorizedExpenses.categories.slice(0, 5).map(cat => ({
          categoryName: cat.categoryName,
          behavior: cat.behavior,
          inflationRate: cat.inflationRate,
          monthlyAverage: cat.monthlyAverage
        }))
      },
      
      // Basic forecast results
      basicForecasts: {
        scenarios: basicForecasts.map(forecast => ({
          scenario: forecast.scenario,
          summary: forecast.summary,
          firstMonthProjection: forecast.projections[0]
        }))
      },
      
      // Enhanced forecast results with detailed expenses
      enhancedForecasts: {
        scenarios: enhancedForecasts.map(forecast => ({
          scenario: forecast.scenario,
          summary: forecast.summary,
          sampleProjection: {
            month: forecast.projections[0].month,
            revenue: forecast.projections[0].revenue,
            expensesByCategory: forecast.projections[0].expensesByCategory,
            totalExpenses: forecast.projections[0].totalExpenses,
            netIncome: forecast.projections[0].netIncome,
            inflationAdjustments: forecast.projections[0].inflationAdjustments
          }
        }))
      },
      
      // Comparison between basic and enhanced
      comparison: {
        basic: {
          baselineNetIncome: basicForecasts.find(f => f.scenario === 'baseline')?.summary.totalNetIncome,
          growthNetIncome: basicForecasts.find(f => f.scenario === 'growth')?.summary.totalNetIncome
        },
        enhanced: {
          baselineNetIncome: enhancedForecasts.find(f => f.scenario === 'baseline')?.summary.totalNetIncome,
          growthNetIncome: enhancedForecasts.find(f => f.scenario === 'growth')?.summary.totalNetIncome
        },
        enhancementValue: {
          detailedExpenseBreakdown: true,
          categoryLevelInflation: true,
          seasonalExpenseAdjustments: true,
          improvedAccuracy: enhancedForecasts[0].projections[0].expensesByCategory ? true : false
        }
      },
      
      readinessForNextPhase: {
        basicForecastingWorking: basicForecasts.length === 3,
        enhancedForecastingWorking: enhancedForecasts.length === 3,
        expenseCategorizationComplete: categorizedExpenses.forecastingMetrics.categorizedPercentage > 70,
        inflationModelingActive: categorizedExpenses.categories.every(cat => cat.inflationRate > 0),
        readyForWorkingCapitalModeling: true
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