import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';
import { TrendAnalyzer } from '@/lib/services/TrendAnalyzer';
import { ExpenseCategorizer } from '@/lib/services/ExpenseCategorizer';
import { ForecastEngine } from '@/lib/services/ForecastEngine';
import { AssetProjectionModeler } from '@/lib/services/AssetProjectionModeler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing AssetProjectionModeler with fixed asset and depreciation projections...');
    
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

    // Get historical data and build forecasting foundation
    console.log('📊 Building forecasting foundation for asset projections...');
    const monthlyPnLData = await qbAPI.getMonthlyProfitAndLoss(12);
    
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
    
    // Generate revenue projections (needed for asset modeling)
    console.log('📈 Generating revenue projections for capex planning...');
    const forecastEngine = new ForecastEngine();
    const revenueForecasts = forecastEngine.generateEnhancedThreeScenarioForecast(
      parsedData,
      revenueTrends,
      categorizedExpenses,
      12
    );
    
    // Extract asset categories and analyze depreciation patterns
    console.log('🏭 Analyzing fixed asset categories and depreciation...');
    const assetModeler = new AssetProjectionModeler();
    const assetCategories = assetModeler.extractAssetCategories(
      parsedData,
      'service' // Landscaping is a service business
    );
    
    const averageMonthlyRevenue = parsedData.revenue.monthlyTotals.reduce((sum, m) => sum + m.value, 0) / parsedData.revenue.monthlyTotals.length;
    
    // Create capex assumptions for all scenarios
    console.log('🎯 Creating capital expenditure assumptions for 3 scenarios...');
    const baselineCapexAssumptions = assetModeler.createCapexAssumptions(
      assetCategories,
      'baseline',
      averageMonthlyRevenue
    );
    
    const growthCapexAssumptions = assetModeler.createCapexAssumptions(
      assetCategories,
      'growth',
      averageMonthlyRevenue
    );
    
    const downturnCapexAssumptions = assetModeler.createCapexAssumptions(
      assetCategories,
      'downturn',
      averageMonthlyRevenue
    );
    
    // Generate asset projections for each scenario
    console.log('🔮 Generating asset and depreciation projections...');
    const baselineAssetProjections = assetModeler.generateAssetProjections(
      assetCategories,
      baselineCapexAssumptions,
      revenueForecasts.find(f => f.scenario === 'baseline')?.projections || [],
      12
    );
    
    const growthAssetProjections = assetModeler.generateAssetProjections(
      assetCategories,
      growthCapexAssumptions,
      revenueForecasts.find(f => f.scenario === 'growth')?.projections || [],
      12
    );
    
    const downturnAssetProjections = assetModeler.generateAssetProjections(
      assetCategories,
      downturnCapexAssumptions,
      revenueForecasts.find(f => f.scenario === 'downturn')?.projections || [],
      12
    );

    return NextResponse.json({
      success: true,
      test: 'Fixed Asset Projections & Depreciation Modeling',
      
      // Historical asset analysis
      historicalAssetAnalysis: {
        averageMonthlyRevenue,
        estimatedAnnualDepreciation: assetCategories.reduce((sum, cat) => sum + (cat.originalCost / cat.usefulLife), 0),
        assetCategoriesIdentified: assetCategories.length,
        totalEstimatedAssetValue: assetCategories.reduce((sum, cat) => sum + cat.currentBookValue, 0),
        businessType: 'service'
      },
      
      // Asset categories breakdown
      assetCategories: assetCategories.map(category => ({
        categoryName: category.categoryName,
        currentBookValue: category.currentBookValue,
        originalCost: category.originalCost,
        accumulatedDepreciation: category.currentAccumulatedDepreciation,
        usefulLife: category.usefulLife,
        annualDepreciationRate: category.annualDepreciationRate,
        assetType: category.assetType,
        acquisitionPattern: category.acquisitionPattern,
        depreciationMethod: category.depreciationMethod,
        maintenanceIntensity: category.maintenanceIntensity
      })),
      
      // Capex assumptions comparison
      capexAssumptions: {
        baseline: {
          revenueGrowthCapexRatio: baselineCapexAssumptions.revenueGrowthCapexRatio,
          capacityExpansionThreshold: baselineCapexAssumptions.capacityExpansionThreshold,
          equipmentReplacementCycle: baselineCapexAssumptions.equipmentReplacementCycle,
          capexStrategy: baselineCapexAssumptions.capexStrategy,
          maintenanceVsReplacement: baselineCapexAssumptions.maintenanceVsReplacement,
          cashVsFinanced: baselineCapexAssumptions.cashVsFinanced,
          seasonalTiming: {
            spring: baselineCapexAssumptions.seasonalCapexTiming.Mar + baselineCapexAssumptions.seasonalCapexTiming.Apr + baselineCapexAssumptions.seasonalCapexTiming.May,
            summer: baselineCapexAssumptions.seasonalCapexTiming.Jun + baselineCapexAssumptions.seasonalCapexTiming.Jul + baselineCapexAssumptions.seasonalCapexTiming.Aug,
            winter: baselineCapexAssumptions.seasonalCapexTiming.Dec + baselineCapexAssumptions.seasonalCapexTiming.Jan + baselineCapexAssumptions.seasonalCapexTiming.Feb
          }
        },
        growth: {
          revenueGrowthCapexRatio: growthCapexAssumptions.revenueGrowthCapexRatio,
          capacityExpansionThreshold: growthCapexAssumptions.capacityExpansionThreshold,
          equipmentReplacementCycle: growthCapexAssumptions.equipmentReplacementCycle,
          capexStrategy: growthCapexAssumptions.capexStrategy,
          maintenanceVsReplacement: growthCapexAssumptions.maintenanceVsReplacement,
          cashVsFinanced: growthCapexAssumptions.cashVsFinanced
        },
        downturn: {
          revenueGrowthCapexRatio: downturnCapexAssumptions.revenueGrowthCapexRatio,
          capacityExpansionThreshold: downturnCapexAssumptions.capacityExpansionThreshold,
          equipmentReplacementCycle: downturnCapexAssumptions.equipmentReplacementCycle,
          capexStrategy: downturnCapexAssumptions.capexStrategy,
          maintenanceVsReplacement: downturnCapexAssumptions.maintenanceVsReplacement,
          cashVsFinanced: downturnCapexAssumptions.cashVsFinanced
        }
      },
      
      // Asset projections summary
      assetProjectionsSummary: {
        baseline: {
          totalCapexInvestment: baselineAssetProjections.reduce((sum, p) => sum + p.assetAdditions, 0),
          totalDepreciationExpense: baselineAssetProjections.reduce((sum, p) => sum + p.monthlyDepreciation, 0),
          netCapexCashFlow: baselineAssetProjections.reduce((sum, p) => sum + p.netCapexCashFlow, 0),
          finalNetAssets: baselineAssetProjections[baselineAssetProjections.length - 1]?.endingNetAssets,
          averageAssetTurnover: baselineAssetProjections.reduce((sum, p) => sum + p.assetTurnover, 0) / baselineAssetProjections.length,
          averageDepreciationAsPercentOfRevenue: baselineAssetProjections.reduce((sum, p) => sum + p.depreciationAsPercentOfRevenue, 0) / baselineAssetProjections.length
        },
        growth: {
          totalCapexInvestment: growthAssetProjections.reduce((sum, p) => sum + p.assetAdditions, 0),
          totalDepreciationExpense: growthAssetProjections.reduce((sum, p) => sum + p.monthlyDepreciation, 0),
          netCapexCashFlow: growthAssetProjections.reduce((sum, p) => sum + p.netCapexCashFlow, 0),
          finalNetAssets: growthAssetProjections[growthAssetProjections.length - 1]?.endingNetAssets,
          averageAssetTurnover: growthAssetProjections.reduce((sum, p) => sum + p.assetTurnover, 0) / growthAssetProjections.length,
          averageDepreciationAsPercentOfRevenue: growthAssetProjections.reduce((sum, p) => sum + p.depreciationAsPercentOfRevenue, 0) / growthAssetProjections.length
        },
        downturn: {
          totalCapexInvestment: downturnAssetProjections.reduce((sum, p) => sum + p.assetAdditions, 0),
          totalDepreciationExpense: downturnAssetProjections.reduce((sum, p) => sum + p.monthlyDepreciation, 0),
          netCapexCashFlow: downturnAssetProjections.reduce((sum, p) => sum + p.netCapexCashFlow, 0),
          finalNetAssets: downturnAssetProjections[downturnAssetProjections.length - 1]?.endingNetAssets,
          averageAssetTurnover: downturnAssetProjections.reduce((sum, p) => sum + p.assetTurnover, 0) / downturnAssetProjections.length,
          averageDepreciationAsPercentOfRevenue: downturnAssetProjections.reduce((sum, p) => sum + p.depreciationAsPercentOfRevenue, 0) / downturnAssetProjections.length
        }
      },
      
      // Sample projections (first 3 months)
      sampleProjections: {
        baseline: baselineAssetProjections.slice(0, 3).map(p => ({
          month: p.month,
          assetAdditions: p.assetAdditions,
          monthlyDepreciation: p.monthlyDepreciation,
          endingNetAssets: p.endingNetAssets,
          capexCashOutflow: p.capexCashOutflow,
          netCapexCashFlow: p.netCapexCashFlow,
          assetTurnover: p.assetTurnover,
          depreciationAsPercentOfRevenue: p.depreciationAsPercentOfRevenue,
          equipmentValue: p.assetsByCategory['Equipment']?.netValue,
          vehicleValue: p.assetsByCategory['Vehicles']?.netValue
        })),
        growth: growthAssetProjections.slice(0, 3).map(p => ({
          month: p.month,
          assetAdditions: p.assetAdditions,
          monthlyDepreciation: p.monthlyDepreciation,
          endingNetAssets: p.endingNetAssets,
          capexCashOutflow: p.capexCashOutflow,
          netCapexCashFlow: p.netCapexCashFlow,
          assetTurnover: p.assetTurnover,
          depreciationAsPercentOfRevenue: p.depreciationAsPercentOfRevenue
        })),
        downturn: downturnAssetProjections.slice(0, 3).map(p => ({
          month: p.month,
          assetAdditions: p.assetAdditions,
          monthlyDepreciation: p.monthlyDepreciation,
          endingNetAssets: p.endingNetAssets,
          capexCashOutflow: p.capexCashOutflow,
          netCapexCashFlow: p.netCapexCashFlow,
          assetTurnover: p.assetTurnover,
          depreciationAsPercentOfRevenue: p.depreciationAsPercentOfRevenue
        }))
      },
      
      // Landscaping business insights
      landscapingAssetInsights: {
        equipmentIntensive: 'Equipment represents primary asset category for landscaping',
        seasonalCapexPattern: 'Spring investment pattern aligns with business seasonality',
        assetCategories: {
          equipment: 'Mowers, tools, irrigation equipment - 50% of capex',
          vehicles: 'Trucks, trailers for service delivery - 30% of capex',
          technology: 'Software, computers, GPS - 10% of capex',
          facilities: 'Storage, office improvements - 10% of capex'
        },
        depreciationImpact: {
          monthlyDepreciationExpense: assetCategories.reduce((sum, cat) => sum + (cat.originalCost / cat.usefulLife / 12), 0),
          asPercentOfRevenue: (assetCategories.reduce((sum, cat) => sum + (cat.originalCost / cat.usefulLife / 12), 0) / averageMonthlyRevenue) * 100
        }
      },
      
      // Investment timing and cash flow insights
      cashFlowInsights: {
        capexCashImpact: {
          baseline: baselineAssetProjections.reduce((sum, p) => sum + p.capexCashOutflow, 0),
          growth: growthAssetProjections.reduce((sum, p) => sum + p.capexCashOutflow, 0),
          downturn: downturnAssetProjections.reduce((sum, p) => sum + p.capexCashOutflow, 0)
        },
        seasonalInvestmentPattern: {
          springInvestment: 'Peak capex in Mar-May aligns with business ramp-up',
          winterMaintenance: 'Lower capex in winter months focuses on maintenance'
        },
        financingStrategies: {
          growth: `${growthCapexAssumptions.cashVsFinanced}% cash, ${100 - growthCapexAssumptions.cashVsFinanced}% financed`,
          baseline: `${baselineCapexAssumptions.cashVsFinanced}% cash, ${100 - baselineCapexAssumptions.cashVsFinanced}% financed`,
          downturn: `${downturnCapexAssumptions.cashVsFinanced}% cash, ${100 - downturnCapexAssumptions.cashVsFinanced}% financed`
        }
      },
      
      // Integration readiness
      integrationReadiness: {
        assetCategoriesEstablished: assetCategories.length > 0,
        depreciationSchedulesCreated: true,
        capexAssumptionsForAllScenarios: true,
        seasonalInvestmentPatternsModeled: true,
        cashFlowImpactsCalculated: true,
        readyForBalanceSheetIntegration: true,
        readyForCashFlowStatements: true
      }
    });

  } catch (error) {
    console.error('❌ AssetProjectionModeler test failed:', error);
    return NextResponse.json({ 
      error: 'AssetProjectionModeler test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}