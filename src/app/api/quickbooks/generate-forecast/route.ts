/**
 * API endpoint for generating driver-based forecasts
 * Integrates discovered drivers with DriverForecastService
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getValidConnection } from '@/lib/quickbooks/connectionManager';
import { DriverDiscoveryService } from '@/lib/services/DriverDiscoveryService';
import { DriverForecastService } from '@/lib/services/DriverForecastService';
import { FinancialDataParser } from '@/lib/services/FinancialDataParser';
import { InsightEngine } from '@/lib/services/InsightEngine';
import { getQuickBooksApiUrl } from '@/lib/quickbooks/config';
import { 
  ForecastRequest, 
  ForecastResponse, 
  DriverAdjustment,
  Scenario 
} from '@/types/forecastTypes';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Parse request body
    const body: ForecastRequest = await request.json();
    const {
      monthsToProject = 3,
      includeConfidenceBands = true,
      scenarios = [],
      adjustments = [],
      companyId
    } = body;

    console.log(`🔮 Generating forecast for user ${session.user.dbId}`);
    console.log(`📊 Parameters: ${monthsToProject} months, ${scenarios.length} scenarios, ${adjustments.length} adjustments`);

    // Get valid QuickBooks connection
    // Pass company_id to use selected company instead of defaulting to first
    const connection = await getValidConnection(session.user.dbId, companyId || undefined);

    // Initialize services
    const parser = new FinancialDataParser();
    const driverService = new DriverDiscoveryService();
    const forecastService = new DriverForecastService();
    const insightEngine = new InsightEngine();

    // Step 1: Get QuickBooks P&L data
    console.log('📈 Fetching QuickBooks P&L data...');
    
    // Get 24 months of data for analysis
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);
    const endDate = new Date();
    
    const qbUrl = `${getQuickBooksApiUrl(connection.realm_id, 'reports/ProfitAndLoss')}?minorversion=65&accounting_method=Accrual&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&summarize_column_by=Month`;
    
    const qbResponse = await fetch(qbUrl, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store' as RequestCache,
    });

    if (!qbResponse.ok) {
      const errorText = await qbResponse.text();
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch QuickBooks data',
        details: errorText 
      }, { status: qbResponse.status });
    }

    const profitLossData = await qbResponse.json();
    
    // The QuickBooks response structure is already the report format we need
    // It has Header, Columns, Rows directly at the root level
    const profitLossReport = profitLossData;
    
    // Step 2: Parse financial data
    console.log('🔄 Parsing financial data...');
    const parsedData = parser.parseMonthlyProfitLoss(profitLossReport);

    // Step 3: Discover drivers
    console.log('🔍 Discovering business drivers...');
    const driverResult = await driverService.discoverDrivers(parsedData);

    if (driverResult.drivers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No suitable drivers found in your financial data',
        warnings: ['Insufficient historical data or all line items below threshold']
      });
    }

    // Step 4: Generate base forecast
    console.log(`🚀 Generating base forecast from ${driverResult.drivers.length} drivers...`);
    const baseForecast = forecastService.generateBaseForecast(
      driverResult.drivers, 
      monthsToProject
    );

    // Step 5: Apply adjustments if provided
    let finalForecast = baseForecast;
    if (adjustments.length > 0) {
      console.log(`🎛️ Applying ${adjustments.length} user adjustments...`);
      finalForecast = forecastService.applyAdjustments(baseForecast, adjustments);
    }

    // Step 6: Generate scenario comparison if scenarios provided
    let scenarioComparison;
    if (scenarios.length > 0) {
      console.log(`📊 Generating scenario comparison for ${scenarios.length} scenarios...`);
      scenarioComparison = forecastService.generateScenarioComparison(
        baseForecast, 
        scenarios
      );
    }

    // Step 7: Generate intelligent insights
    console.log('🧠 Generating intelligent insights...');
    const insights = insightEngine.generateInsights(
      parsedData,
      driverResult.drivers,
      finalForecast.monthlyProjections
    );

    // Step 8: Prepare response
    const response: ForecastResponse = {
      success: true,
      forecast: {
        ...finalForecast,
        insights
      },
      scenarios: scenarioComparison
    };

    // Add warnings for low confidence or data issues
    const warnings: string[] = [];
    if (finalForecast.confidence.overall === 'low') {
      warnings.push('Forecast confidence is low due to limited historical data or high adjustments');
    }
    
    if (driverResult.drivers.some(d => d.dataQuality < 0.6)) {
      warnings.push('Some drivers have incomplete historical data, affecting forecast accuracy');
    }

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    console.log(`✅ Forecast generated successfully`);
    console.log(`💰 Total projected revenue: ${finalForecast.summary.totalProjectedRevenue.toLocaleString()}`);
    console.log(`📈 Net income: ${finalForecast.summary.totalNetIncome.toLocaleString()}`);
    console.log(`🎯 Confidence: ${finalForecast.confidence.overall}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error generating forecast:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate forecast',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check  
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const monthsToProject = parseInt(searchParams.get('months') || '3');
    const includeConfidenceBands = searchParams.get('confidence') !== 'false';

    console.log(`🔮 Generating simple forecast: ${monthsToProject} months`);

    // Get valid QuickBooks connection
    const connection = await getValidConnection(session.user.dbId);

    // Initialize services
    const parser = new FinancialDataParser();
    const driverService = new DriverDiscoveryService();
    const forecastService = new DriverForecastService();
    const insightEngine = new InsightEngine();

    // Get QuickBooks P&L data
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);
    const endDate = new Date();
    
    const qbUrl = `${getQuickBooksApiUrl(connection.realm_id, 'reports/ProfitAndLoss')}?minorversion=65&accounting_method=Accrual&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&summarize_column_by=Month`;
    
    const qbResponse = await fetch(qbUrl, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store' as RequestCache,
    });

    if (!qbResponse.ok) {
      const errorText = await qbResponse.text();
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch QuickBooks data',
        details: errorText 
      }, { status: qbResponse.status });
    }

    const profitLossData = await qbResponse.json();
    
    // The QuickBooks response structure is already the report format we need
    const profitLossReport = profitLossData;
    
    const parsedData = parser.parseMonthlyProfitLoss(profitLossReport);
    const driverResult = await driverService.discoverDrivers(parsedData);
    
    if (driverResult.drivers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No drivers found - insufficient historical data'
      });
    }

    const baseForecast = forecastService.generateBaseForecast(
      driverResult.drivers, 
      monthsToProject
    );

    // Generate intelligent insights
    console.log('🧠 Generating intelligent insights...');
    const insights = insightEngine.generateInsights(
      parsedData,
      driverResult.drivers,
      baseForecast.monthlyProjections
    );

    const response: ForecastResponse = {
      success: true,
      forecast: {
        ...baseForecast,
        insights
      }
    };

    console.log(`✅ Simple forecast generated: ${driverResult.drivers.length} drivers, ${monthsToProject} months`);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error generating simple forecast:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate forecast',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}