import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';
import { TrendAnalyzer } from '@/lib/services/TrendAnalyzer';
import { ExpenseCategorizer } from '@/lib/services/ExpenseCategorizer';
import { ForecastEngine } from '@/lib/services/ForecastEngine';
import { WorkingCapitalModeler } from '@/lib/services/WorkingCapitalModeler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing WorkingCapitalModeler with 3-scenario working capital projections...');
    
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
    console.log('📊 Fetching historical data for working capital analysis...');
    const monthlyPnLData = await qbAPI.getMonthlyProfitAndLoss(12);
    
    // Parse and analyze data for forecasting
    console.log('🔄 Building forecasting foundation...');
    const parser = new FinancialDataParser();
    const parsedData = parser.parseMonthlyProfitLoss(monthlyPnLData);
    
    const trendAnalyzer = new TrendAnalyzer();
    const revenueTrends = trendAnalyzer.analyzeRevenueTrends(parsedData);
    const expenseBreakdown = trendAnalyzer.analyzeExpenseStructure(parsedData);
    
    const expenseCategorizer = new ExpenseCategorizer();
    const categorizedExpenses = expenseCategorizer.categorizeExpenses(
      parsedData,
      revenueTrends,
      expenseBreakdown
    );
    
    // Generate revenue projections (needed for working capital modeling)
    console.log('📈 Generating revenue projections for working capital modeling...');
    const forecastEngine = new ForecastEngine();
    const baselineForecasts = forecastEngine.generateEnhancedThreeScenarioForecast(
      parsedData,
      revenueTrends,
      categorizedExpenses,
      12
    );
    
    // Extract working capital components
    console.log('💰 Analyzing working capital components...');
    const workingCapitalModeler = new WorkingCapitalModeler();
    const workingCapitalComponents = workingCapitalModeler.extractWorkingCapitalComponents(
      parsedData,
      'service' // Landscaping is a service business
    );
    
    // Create working capital assumptions for all scenarios
    console.log('🎯 Creating working capital assumptions for 3 scenarios...');
    const baselineWCAssumptions = workingCapitalModeler.createWorkingCapitalAssumptions(
      workingCapitalComponents,
      'baseline'
    );
    
    const growthWCAssumptions = workingCapitalModeler.createWorkingCapitalAssumptions(
      workingCapitalComponents,
      'growth'
    );
    
    const downturnWCAssumptions = workingCapitalModeler.createWorkingCapitalAssumptions(
      workingCapitalComponents,
      'downturn'
    );
    
    // Generate working capital projections for each scenario
    console.log('🔮 Generating working capital projections...');
    const baselineWCProjections = workingCapitalModeler.generateWorkingCapitalProjections(
      workingCapitalComponents,
      baselineWCAssumptions,
      baselineForecasts.find(f => f.scenario === 'baseline')?.projections || [],
      12
    );
    
    const growthWCProjections = workingCapitalModeler.generateWorkingCapitalProjections(
      workingCapitalComponents,
      growthWCAssumptions,
      baselineForecasts.find(f => f.scenario === 'growth')?.projections || [],
      12
    );
    
    const downturnWCProjections = workingCapitalModeler.generateWorkingCapitalProjections(
      workingCapitalComponents,
      downturnWCAssumptions,
      baselineForecasts.find(f => f.scenario === 'downturn')?.projections || [],
      12
    );

    return NextResponse.json({
      success: true,
      test: 'Working Capital Modeling with 3-Scenario Projections',
      
      // Historical business context
      historicalContext: {
        averageMonthlyRevenue: parsedData.revenue.monthlyTotals.reduce((sum, m) => sum + m.value, 0) / parsedData.revenue.monthlyTotals.length,
        averageMonthlyExpenses: parsedData.expenses.monthlyTotals.reduce((sum, m) => sum + m.value, 0) / parsedData.expenses.monthlyTotals.length,
        businessType: 'service',
        analysisMonths: parsedData.period.months.length
      },
      
      // Working capital component analysis
      workingCapitalComponents: {
        accountsReceivable: {
          estimatedBalance: workingCapitalComponents.accountsReceivable.currentBalance,
          daysOutstanding: workingCapitalComponents.accountsReceivable.daysOutstanding,
          collectionPattern: workingCapitalComponents.accountsReceivable.collectionPattern
        },
        accountsPayable: {
          estimatedBalance: workingCapitalComponents.accountsPayable.currentBalance,
          daysOutstanding: workingCapitalComponents.accountsPayable.daysOutstanding,
          paymentPattern: workingCapitalComponents.accountsPayable.paymentPattern,
          supplierTerms: workingCapitalComponents.accountsPayable.supplierTerms
        },
        inventory: {
          estimatedBalance: workingCapitalComponents.inventory.currentBalance,
          turnoverRatio: workingCapitalComponents.inventory.turnoverRatio,
          daysOnHand: workingCapitalComponents.inventory.daysOnHand
        },
        workingCapitalMetrics: workingCapitalComponents.workingCapitalMetrics
      },
      
      // Scenario assumptions comparison
      scenarioAssumptions: {
        baseline: {
          collectionEfficiencyChange: baselineWCAssumptions.collectionEfficiencyChange,
          badDebtRateChange: baselineWCAssumptions.badDebtRateChange,
          paymentStrategy: baselineWCAssumptions.paymentTimingStrategy,
          supplierNegotiation: baselineWCAssumptions.supplierNegotiationSuccess,
          workingCapitalScaling: baselineWCAssumptions.workingCapitalScalingFactor,
          economicConditions: baselineWCAssumptions.economicConditions
        },
        growth: {
          collectionEfficiencyChange: growthWCAssumptions.collectionEfficiencyChange,
          badDebtRateChange: growthWCAssumptions.badDebtRateChange,
          paymentStrategy: growthWCAssumptions.paymentTimingStrategy,
          supplierNegotiation: growthWCAssumptions.supplierNegotiationSuccess,
          workingCapitalScaling: growthWCAssumptions.workingCapitalScalingFactor,
          economicConditions: growthWCAssumptions.economicConditions
        },
        downturn: {
          collectionEfficiencyChange: downturnWCAssumptions.collectionEfficiencyChange,
          badDebtRateChange: downturnWCAssumptions.badDebtRateChange,
          paymentStrategy: downturnWCAssumptions.paymentTimingStrategy,
          supplierNegotiation: downturnWCAssumptions.supplierNegotiationSuccess,
          workingCapitalScaling: downturnWCAssumptions.workingCapitalScalingFactor,
          economicConditions: downturnWCAssumptions.economicConditions
        }
      },
      
      // Working capital projections summary
      projectionsSummary: {
        baseline: {
          totalWorkingCapitalChange: baselineWCProjections.reduce((sum, p) => sum + p.workingCapitalChange, 0),
          totalCashFlowImpact: baselineWCProjections.reduce((sum, p) => sum + p.netCashFlowFromWorkingCapital, 0),
          averageCashConversionCycle: baselineWCProjections.reduce((sum, p) => sum + p.cashConversionCycle, 0) / baselineWCProjections.length,
          finalARBalance: baselineWCProjections[baselineWCProjections.length - 1]?.endingAR,
          finalAPBalance: baselineWCProjections[baselineWCProjections.length - 1]?.endingAP,
          averageWorkingCapitalRatio: baselineWCProjections.reduce((sum, p) => sum + p.workingCapitalRatio, 0) / baselineWCProjections.length
        },
        growth: {
          totalWorkingCapitalChange: growthWCProjections.reduce((sum, p) => sum + p.workingCapitalChange, 0),
          totalCashFlowImpact: growthWCProjections.reduce((sum, p) => sum + p.netCashFlowFromWorkingCapital, 0),
          averageCashConversionCycle: growthWCProjections.reduce((sum, p) => sum + p.cashConversionCycle, 0) / growthWCProjections.length,
          finalARBalance: growthWCProjections[growthWCProjections.length - 1]?.endingAR,
          finalAPBalance: growthWCProjections[growthWCProjections.length - 1]?.endingAP,
          averageWorkingCapitalRatio: growthWCProjections.reduce((sum, p) => sum + p.workingCapitalRatio, 0) / growthWCProjections.length
        },
        downturn: {
          totalWorkingCapitalChange: downturnWCProjections.reduce((sum, p) => sum + p.workingCapitalChange, 0),
          totalCashFlowImpact: downturnWCProjections.reduce((sum, p) => sum + p.netCashFlowFromWorkingCapital, 0),
          averageCashConversionCycle: downturnWCProjections.reduce((sum, p) => sum + p.cashConversionCycle, 0) / downturnWCProjections.length,
          finalARBalance: downturnWCProjections[downturnWCProjections.length - 1]?.endingAR,
          finalAPBalance: downturnWCProjections[downturnWCProjections.length - 1]?.endingAP,
          averageWorkingCapitalRatio: downturnWCProjections.reduce((sum, p) => sum + p.workingCapitalRatio, 0) / downturnWCProjections.length
        }
      },
      
      // Sample projections (first 3 months)
      sampleProjections: {
        baseline: baselineWCProjections.slice(0, 3).map(p => ({
          month: p.month,
          newSales: p.newSales,
          cashCollected: p.cashCollected,
          newExpenses: p.newExpenses,
          cashPaid: p.cashPaid,
          endingAR: p.endingAR,
          endingAP: p.endingAP,
          workingCapitalChange: p.workingCapitalChange,
          netCashFlowFromWorkingCapital: p.netCashFlowFromWorkingCapital,
          cashConversionCycle: p.cashConversionCycle
        })),
        growth: growthWCProjections.slice(0, 3).map(p => ({
          month: p.month,
          newSales: p.newSales,
          cashCollected: p.cashCollected,
          newExpenses: p.newExpenses,
          cashPaid: p.cashPaid,
          endingAR: p.endingAR,
          endingAP: p.endingAP,
          workingCapitalChange: p.workingCapitalChange,
          netCashFlowFromWorkingCapital: p.netCashFlowFromWorkingCapital,
          cashConversionCycle: p.cashConversionCycle
        })),
        downturn: downturnWCProjections.slice(0, 3).map(p => ({
          month: p.month,
          newSales: p.newSales,
          cashCollected: p.cashCollected,
          newExpenses: p.newExpenses,
          cashPaid: p.cashPaid,
          endingAR: p.endingAR,
          endingAP: p.endingAP,
          workingCapitalChange: p.workingCapitalChange,
          netCashFlowFromWorkingCapital: p.netCashFlowFromWorkingCapital,
          cashConversionCycle: p.cashConversionCycle
        }))
      },
      
      // Cash flow impact analysis
      cashFlowImpacts: {
        workingCapitalIsSource: {
          baseline: baselineWCProjections.reduce((sum, p) => sum + p.netCashFlowFromWorkingCapital, 0) > 0,
          growth: growthWCProjections.reduce((sum, p) => sum + p.netCashFlowFromWorkingCapital, 0) > 0,
          downturn: downturnWCProjections.reduce((sum, p) => sum + p.netCashFlowFromWorkingCapital, 0) > 0
        },
        significantCashImpact: {
          baseline: Math.abs(baselineWCProjections.reduce((sum, p) => sum + p.netCashFlowFromWorkingCapital, 0)),
          growth: Math.abs(growthWCProjections.reduce((sum, p) => sum + p.netCashFlowFromWorkingCapital, 0)),
          downturn: Math.abs(downturnWCProjections.reduce((sum, p) => sum + p.netCashFlowFromWorkingCapital, 0))
        }
      },
      
      // Service business insights
      serviceBusinessInsights: {
        lowInventoryNeeds: workingCapitalComponents.inventory.currentBalance < workingCapitalComponents.accountsReceivable.currentBalance * 0.2,
        collectionFocus: 'Primary working capital driver is accounts receivable management',
        cashConversionOptimization: {
          currentCycle: workingCapitalComponents.workingCapitalMetrics.cashConversionCycle,
          improvementOpportunities: [
            'Faster invoicing and collection processes',
            'Negotiate better supplier payment terms',
            'Implement early payment discounts for customers'
          ]
        }
      },
      
      // Forecasting readiness
      forecastingReadiness: {
        workingCapitalComponentsAnalyzed: true,
        threeScenarioAssumptionsCreated: true,
        workingCapitalProjectionsGenerated: baselineWCProjections.length === 12,
        cashFlowImpactsCalculated: true,
        integrationWithRevenueForecasts: true,
        readyForCashFlowStatements: true
      }
    });

  } catch (error) {
    console.error('❌ WorkingCapitalModeler test failed:', error);
    return NextResponse.json({ 
      error: 'WorkingCapitalModeler test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}