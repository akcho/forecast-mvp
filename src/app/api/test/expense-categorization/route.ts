import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';
import { TrendAnalyzer } from '@/lib/services/TrendAnalyzer';
import { ExpenseCategorizer } from '@/lib/services/ExpenseCategorizer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing ExpenseCategorizer with detailed expense analysis...');
    
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

    // Get historical data
    console.log('📊 Fetching historical data for expense categorization...');
    const monthlyPnLData = await qbAPI.getMonthlyProfitAndLoss(12);
    
    // Parse and analyze data
    console.log('🔄 Parsing and analyzing expense patterns...');
    const parser = new FinancialDataParser();
    const parsedData = parser.parseMonthlyProfitLoss(monthlyPnLData);
    
    const trendAnalyzer = new TrendAnalyzer();
    const revenueTrends = trendAnalyzer.analyzeRevenueTrends(parsedData);
    const expenseBreakdown = trendAnalyzer.analyzeExpenseStructure(parsedData);
    
    // Categorize expenses with detailed analysis
    console.log('🏷️ Categorizing expenses with behavior analysis...');
    const expenseCategorizer = new ExpenseCategorizer();
    const categorizedExpenses = expenseCategorizer.categorizeExpenses(
      parsedData,
      revenueTrends,
      expenseBreakdown
    );

    // Group categories for analysis
    const categoryGroups = categorizedExpenses.categories.reduce((groups, category) => {
      const behavior = category.behavior;
      if (!groups[behavior]) groups[behavior] = [];
      groups[behavior].push(category);
      return groups;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      test: 'Advanced Expense Categorization & Inflation Analysis',
      
      // Raw expense data summary
      rawExpenseData: {
        totalExpenseLines: parsedData.expenses.lines.filter(l => l.type !== 'summary').length,
        totalExpenses: parsedData.expenses.grandTotal,
        monthsAnalyzed: parsedData.period.months.length
      },

      // Categorization results
      categorization: {
        totalCategoriesCreated: categorizedExpenses.categories.length,
        behaviorBreakdown: {
          fixed: categoryGroups.fixed?.length || 0,
          variable: categoryGroups.variable?.length || 0,
          seasonal: categoryGroups.seasonal?.length || 0,
          stepped: categoryGroups.stepped?.length || 0
        },
        costBreakdown: {
          totalFixedCosts: categorizedExpenses.totalFixedCosts,
          totalVariableCosts: categorizedExpenses.totalVariableCosts,
          totalSeasonalCosts: categorizedExpenses.totalSeasonalCosts,
          uncategorizedCosts: categorizedExpenses.uncategorizedCosts,
          percentageCategorized: categorizedExpenses.forecastingMetrics.categorizedPercentage
        }
      },

      // Sample categories for each behavior type
      sampleCategories: {
        fixed: categoryGroups.fixed?.slice(0, 3).map(cat => ({
          name: cat.categoryName,
          accounts: cat.accounts,
          monthlyAverage: cat.monthlyAverage,
          variability: cat.variability,
          inflationRate: cat.inflationRate
        })) || [],
        variable: categoryGroups.variable?.slice(0, 3).map(cat => ({
          name: cat.categoryName,
          accounts: cat.accounts,
          monthlyAverage: cat.monthlyAverage,
          revenueCorrelation: cat.revenueCorrelation,
          scalingFactor: cat.scalingFactor
        })) || [],
        seasonal: categoryGroups.seasonal?.slice(0, 2).map(cat => ({
          name: cat.categoryName,
          accounts: cat.accounts,
          seasonalPattern: cat.seasonalPattern
        })) || []
      },

      // Inflation assumptions
      inflationAssumptions: {
        scenario: categorizedExpenses.inflationAssumptions.scenario,
        rates: {
          generalInflation: categorizedExpenses.inflationAssumptions.generalInflation,
          laborInflation: categorizedExpenses.inflationAssumptions.laborInflation,
          materialInflation: categorizedExpenses.inflationAssumptions.materialInflation,
          utilityInflation: categorizedExpenses.inflationAssumptions.utilityInflation,
          rentInflation: categorizedExpenses.inflationAssumptions.rentInflation
        }
      },

      // Quality metrics
      qualityMetrics: {
        categorizedPercentage: categorizedExpenses.forecastingMetrics.categorizedPercentage,
        averageRevenueCorrelation: categorizedExpenses.forecastingMetrics.averageCorrelation,
        inflationCoverage: categorizedExpenses.forecastingMetrics.inflationCoverage,
        highConfidenceCategories: categorizedExpenses.categories.filter(cat => 
          Math.abs(cat.revenueCorrelation) > 0.6 || cat.variability < 0.2
        ).length
      },

      // Comparison with basic TrendAnalyzer
      comparisonWithBasic: {
        trendAnalyzerVariableCosts: expenseBreakdown.variableCosts.asPercentOfRevenue,
        categorizerVariableCosts: (categorizedExpenses.totalVariableCosts / parsedData.revenue.grandTotal) * 100,
        trendAnalyzerFixedCosts: expenseBreakdown.fixedCosts.monthlyAverage,
        categorizerFixedCosts: categorizedExpenses.totalFixedCosts,
        improvementInDetail: categorizedExpenses.categories.length > (expenseBreakdown.fixedCosts.accounts.length + expenseBreakdown.variableCosts.accounts.length)
      },

      // Forecasting readiness
      forecastingReadiness: {
        detailedCategorizationComplete: categorizedExpenses.forecastingMetrics.categorizedPercentage > 80,
        inflationAssumptionsSet: true,
        behaviorAnalysisComplete: true,
        readyForEnhancedForecasting: categorizedExpenses.categories.length > 0
      }
    });

  } catch (error) {
    console.error('❌ ExpenseCategorizer test failed:', error);
    return NextResponse.json({ 
      error: 'ExpenseCategorizer test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}