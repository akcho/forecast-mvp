import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';
import { TrendAnalyzer } from '@/lib/services/TrendAnalyzer';
import { ServiceBusinessForecaster } from '@/lib/services/ServiceBusinessForecaster';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing ServiceBusinessForecaster with landscaping business data...');
    
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
    console.log('📊 Fetching historical data for service business analysis...');
    const monthlyPnLData = await qbAPI.getMonthlyProfitAndLoss(12);
    
    // Parse and analyze data
    console.log('🔄 Parsing and analyzing revenue patterns...');
    const parser = new FinancialDataParser();
    const parsedData = parser.parseMonthlyProfitLoss(monthlyPnLData);
    
    const trendAnalyzer = new TrendAnalyzer();
    const revenueTrends = trendAnalyzer.analyzeRevenueTrends(parsedData);
    
    // Analyze service business characteristics
    console.log('🏢 Analyzing service business metrics...');
    const serviceForecaster = new ServiceBusinessForecaster();
    const serviceMetrics = serviceForecaster.analyzeServiceBusinessMetrics(
      parsedData,
      revenueTrends
    );
    
    // Create assumptions for all 3 scenarios
    console.log('🎯 Creating service business assumptions for 3 scenarios...');
    const baselineAssumptions = serviceForecaster.createServiceBusinessAssumptions(
      serviceMetrics,
      revenueTrends,
      'baseline'
    );
    
    const growthAssumptions = serviceForecaster.createServiceBusinessAssumptions(
      serviceMetrics,
      revenueTrends,
      'growth'
    );
    
    const downturnAssumptions = serviceForecaster.createServiceBusinessAssumptions(
      serviceMetrics,
      revenueTrends,
      'downturn'
    );
    
    // Generate service revenue projections for each scenario
    console.log('📈 Generating service revenue projections...');
    const baselineProjections = serviceForecaster.generateServiceRevenueProjections(
      serviceMetrics,
      baselineAssumptions,
      12
    );
    
    const growthProjections = serviceForecaster.generateServiceRevenueProjections(
      serviceMetrics,
      growthAssumptions,
      12
    );
    
    const downturnProjections = serviceForecaster.generateServiceRevenueProjections(
      serviceMetrics,
      downturnAssumptions,
      12
    );

    return NextResponse.json({
      success: true,
      test: 'Service Business Revenue Forecasting Validation',
      
      // Historical analysis
      historicalAnalysis: {
        totalRevenue: parsedData.revenue.grandTotal,
        monthsAnalyzed: parsedData.period.months.length,
        averageMonthlyRevenue: serviceMetrics.averageMonthlyRevenue,
        revenueVolatility: serviceMetrics.revenueVolatility,
        seasonalPeakMultiplier: serviceMetrics.seasonalPeakMultiplier
      },
      
      // Service business characteristics
      serviceBusinessMetrics: {
        estimatedCustomers: serviceMetrics.estimatedCustomerCount,
        averageRevenuePerCustomer: serviceMetrics.averageRevenuePerCustomer,
        customerAcquisitionRate: serviceMetrics.customerAcquisitionRate,
        customerRetentionRate: serviceMetrics.customerRetentionRate,
        capacityUtilization: serviceMetrics.estimatedCapacityUtilization,
        businessMaturity: serviceMetrics.businessMaturity,
        growthPotential: serviceMetrics.growthPotential,
        scalingEfficiency: serviceMetrics.scalingEfficiency
      },
      
      // Scenario assumptions comparison
      scenarioAssumptions: {
        baseline: {
          customerGrowthRate: baselineAssumptions.targetCustomerGrowthRate,
          arpcGrowth: baselineAssumptions.averageRevenuePerCustomerGrowth,
          marketSaturation: baselineAssumptions.marketSaturation,
          competitiveIntensity: baselineAssumptions.competitiveIntensity,
          serviceDeliveryModel: baselineAssumptions.serviceDeliveryModel,
          capacityExpansionMonths: baselineAssumptions.capacityExpansionPlan.monthsToExpand
        },
        growth: {
          customerGrowthRate: growthAssumptions.targetCustomerGrowthRate,
          arpcGrowth: growthAssumptions.averageRevenuePerCustomerGrowth,
          marketSaturation: growthAssumptions.marketSaturation,
          competitiveIntensity: growthAssumptions.competitiveIntensity,
          serviceDeliveryModel: growthAssumptions.serviceDeliveryModel,
          capacityExpansionMonths: growthAssumptions.capacityExpansionPlan.monthsToExpand
        },
        downturn: {
          customerGrowthRate: downturnAssumptions.targetCustomerGrowthRate,
          arpcGrowth: downturnAssumptions.averageRevenuePerCustomerGrowth,
          marketSaturation: downturnAssumptions.marketSaturation,
          competitiveIntensity: downturnAssumptions.competitiveIntensity,
          serviceDeliveryModel: downturnAssumptions.serviceDeliveryModel,
          capacityExpansionMonths: downturnAssumptions.capacityExpansionPlan.monthsToExpand
        }
      },
      
      // Revenue projections summary
      projectionsSummary: {
        baseline: {
          totalProjectedRevenue: baselineProjections.reduce((sum, p) => sum + p.totalRevenue, 0),
          finalMonthCustomers: baselineProjections[baselineProjections.length - 1]?.estimatedCustomers,
          finalMonthARPC: baselineProjections[baselineProjections.length - 1]?.averageRevenuePerCustomer,
          averageCapacityUtilization: baselineProjections.reduce((sum, p) => sum + p.capacityUtilization, 0) / baselineProjections.length,
          monthsCapacityConstrained: baselineProjections.filter(p => p.capacityConstrainted).length
        },
        growth: {
          totalProjectedRevenue: growthProjections.reduce((sum, p) => sum + p.totalRevenue, 0),
          finalMonthCustomers: growthProjections[growthProjections.length - 1]?.estimatedCustomers,
          finalMonthARPC: growthProjections[growthProjections.length - 1]?.averageRevenuePerCustomer,
          averageCapacityUtilization: growthProjections.reduce((sum, p) => sum + p.capacityUtilization, 0) / growthProjections.length,
          monthsCapacityConstrained: growthProjections.filter(p => p.capacityConstrainted).length
        },
        downturn: {
          totalProjectedRevenue: downturnProjections.reduce((sum, p) => sum + p.totalRevenue, 0),
          finalMonthCustomers: downturnProjections[downturnProjections.length - 1]?.estimatedCustomers,
          finalMonthARPC: downturnProjections[downturnProjections.length - 1]?.averageRevenuePerCustomer,
          averageCapacityUtilization: downturnProjections.reduce((sum, p) => sum + p.capacityUtilization, 0) / downturnProjections.length,
          monthsCapacityConstrained: downturnProjections.filter(p => p.capacityConstrainted).length
        }
      },
      
      // Sample projections (first 3 months)
      sampleProjections: {
        baseline: baselineProjections.slice(0, 3).map(p => ({
          month: p.month,
          estimatedCustomers: p.estimatedCustomers,
          totalRevenue: p.totalRevenue,
          recurringRevenue: p.recurringRevenue,
          projectRevenue: p.projectRevenue,
          capacityUtilization: p.capacityUtilization,
          seasonalAdjustment: p.seasonalAdjustment
        })),
        growth: growthProjections.slice(0, 3).map(p => ({
          month: p.month,
          estimatedCustomers: p.estimatedCustomers,
          totalRevenue: p.totalRevenue,
          recurringRevenue: p.recurringRevenue,
          projectRevenue: p.projectRevenue,
          capacityUtilization: p.capacityUtilization,
          seasonalAdjustment: p.seasonalAdjustment
        })),
        downturn: downturnProjections.slice(0, 3).map(p => ({
          month: p.month,
          estimatedCustomers: p.estimatedCustomers,
          totalRevenue: p.totalRevenue,
          recurringRevenue: p.recurringRevenue,
          projectRevenue: p.projectRevenue,
          capacityUtilization: p.capacityUtilization,
          seasonalAdjustment: p.seasonalAdjustment
        }))
      },
      
      // Landscaping business insights
      landscapingInsights: {
        seasonalPattern: {
          peakSeasons: baselineAssumptions.seasonalFactors.peakSeasons,
          lowSeasons: baselineAssumptions.seasonalFactors.lowSeasons,
          peakMultiplier: baselineAssumptions.seasonalFactors.peakMultiplier
        },
        businessModel: baselineAssumptions.serviceDeliveryModel,
        customerDynamics: {
          estimatedRetentionRate: serviceMetrics.customerRetentionRate,
          acquisitionRate: serviceMetrics.customerAcquisitionRate,
          contractDuration: baselineAssumptions.contractDuration
        },
        capacityManagement: {
          currentUtilization: serviceMetrics.estimatedCapacityUtilization,
          expansionPlan: baselineAssumptions.capacityExpansionPlan
        }
      },
      
      // Forecasting readiness
      forecastingReadiness: {
        serviceMetricsAnalyzed: true,
        customerEstimatesCreated: serviceMetrics.estimatedCustomerCount > 0,
        seasonalPatternsDetected: baselineAssumptions.seasonalFactors.peakSeasons.length > 0,
        capacityConstraintsModeled: true,
        multiScenarioProjectionsGenerated: baselineProjections.length === 12 && growthProjections.length === 12,
        readyForWorkingCapitalIntegration: true
      }
    });

  } catch (error) {
    console.error('❌ ServiceBusinessForecaster test failed:', error);
    return NextResponse.json({ 
      error: 'ServiceBusinessForecaster test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}