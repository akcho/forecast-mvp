import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';
import { TrendAnalyzer } from '@/lib/services/TrendAnalyzer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing TrendAnalyzer with historical P&L data...');
    
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

    // Get 12 months of P&L data for trend analysis
    console.log('📊 Fetching 12-month P&L data for trend analysis...');
    const monthlyPnLData = await qbAPI.getMonthlyProfitAndLoss(12);
    
    // Parse the data
    console.log('🔄 Parsing data with FinancialDataParser...');
    const parser = new FinancialDataParser();
    const parsedData = parser.parseMonthlyProfitLoss(monthlyPnLData);
    
    // Analyze trends
    console.log('📈 Analyzing revenue trends...');
    const trendAnalyzer = new TrendAnalyzer();
    const revenueTrends = trendAnalyzer.analyzeRevenueTrends(parsedData);
    
    console.log('💰 Analyzing expense structure...');
    const expenseBreakdown = trendAnalyzer.analyzeExpenseStructure(parsedData);

    return NextResponse.json({
      success: true,
      test: 'Historical trend analysis validation',
      dataPeriod: {
        start: parsedData.period.start,
        end: parsedData.period.end,
        monthsAnalyzed: parsedData.period.months.length
      },
      revenueTrends: {
        growth: {
          monthlyGrowthRate: revenueTrends.monthlyGrowthRate,
          annualizedGrowthRate: revenueTrends.annualizedGrowthRate,
          trendDirection: revenueTrends.trendDirection,
          confidenceLevel: revenueTrends.confidenceLevel
        },
        patterns: {
          seasonalityScore: revenueTrends.seasonalityScore,
          volatilityScore: revenueTrends.volatilityScore,
          peakMonths: revenueTrends.peakMonths,
          lowMonths: revenueTrends.lowMonths
        },
        businessMetrics: {
          averageMonthlyRevenue: revenueTrends.averageMonthlyRevenue,
          averageNetMargin: revenueTrends.averageNetMargin,
          recommendedGrowthRate: revenueTrends.recommendedGrowthRate
        }
      },
      expenseAnalysis: {
        structure: {
          fixedCostsAverage: expenseBreakdown.fixedCosts.monthlyAverage,
          fixedCostsAccounts: expenseBreakdown.fixedCosts.accounts.length,
          variableCostsPercent: expenseBreakdown.variableCosts.asPercentOfRevenue,
          variableCostsAccounts: expenseBreakdown.variableCosts.accounts.length,
          seasonalCostsAccounts: expenseBreakdown.seasonalCosts.accounts.length
        },
        insights: {
          fixedCostVariability: expenseBreakdown.fixedCosts.variability,
          revenueCorrelation: expenseBreakdown.variableCosts.correlation,
          seasonalPeaks: expenseBreakdown.seasonalCosts.peakMonths
        },
        categories: {
          fixedCosts: expenseBreakdown.fixedCosts.accounts.slice(0, 5), // Top 5 for preview
          variableCosts: expenseBreakdown.variableCosts.accounts.slice(0, 5),
          seasonalCosts: expenseBreakdown.seasonalCosts.accounts
        }
      },
      forecastingInputs: {
        recommendedGrowthRate: revenueTrends.recommendedGrowthRate,
        confidenceLevel: revenueTrends.confidenceLevel,
        seasonalAdjustments: revenueTrends.peakMonths,
        variableCostRatio: expenseBreakdown.variableCosts.asPercentOfRevenue,
        fixedCostBase: expenseBreakdown.fixedCosts.monthlyAverage
      },
      readinessForPhase2: {
        trendsAnalyzed: true,
        growthRatesCalculated: !isNaN(revenueTrends.monthlyGrowthRate),
        expenseStructureIdentified: expenseBreakdown.fixedCosts.accounts.length > 0 || expenseBreakdown.variableCosts.accounts.length > 0,
        seasonalityDetected: revenueTrends.seasonalityScore > 0.1,
        readyForForecasting: true
      }
    });

  } catch (error) {
    console.error('❌ Trend analysis test failed:', error);
    return NextResponse.json({ 
      error: 'Trend analysis test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}