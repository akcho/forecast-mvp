/**
 * ChatDataService - Aggregates rich financial context for AI chat
 * Transforms generic responses into specific, data-driven business insights
 */

import { DriverDiscoveryService } from './DriverDiscoveryService';
import { InsightEngine } from './InsightEngine';
import { FinancialDataParser } from './FinancialDataParser';
import { DriverForecastService } from './DriverForecastService';

export interface BusinessProfile {
  name: string;
  industry: string;
  monthlyRevenue: number;
  dataQuality: {
    monthsOfData: number;
    reliability: 'high' | 'medium' | 'low';
    missingRecentData: boolean;
    lastDataMonth: string;
  };
}

export interface ChatContext {
  businessProfile: BusinessProfile;
  keyDrivers: Array<{
    name: string;
    category: 'revenue' | 'expense';
    materiality: number; // % of total revenue/expenses
    confidence: 'high' | 'medium' | 'low';
  }>;
  insights: {
    primary: string;
    validation: string;
    opportunity: string;
  };
  recentTrends: {
    revenue: { growth: number; trend: string };
    expenses: { growth: number; trend: string };
  };
}

export class ChatDataService {
  private driverService: DriverDiscoveryService;
  private insightEngine: InsightEngine;
  private parser: FinancialDataParser;
  private forecastService: DriverForecastService;
  
  constructor() {
    this.driverService = new DriverDiscoveryService();
    this.insightEngine = new InsightEngine();
    this.parser = new FinancialDataParser();
    this.forecastService = new DriverForecastService();
  }

  /**
   * Get comprehensive business context for AI chat
   */
  async getChatContext(profitLossReport: any): Promise<ChatContext> {
    // Parse financial data
    const parsedData = this.parser.parseMonthlyProfitLoss(profitLossReport);
    
    // Discover key drivers
    const driverResult = await this.driverService.discoverDrivers(parsedData);
    
    // Generate base forecast for insights
    const baseForecast = this.forecastService.generateBaseForecast(
      driverResult.drivers, 
      3
    );
    
    // Generate insights
    const insights = this.insightEngine.generateInsights(
      parsedData,
      driverResult.drivers,
      baseForecast.monthlyProjections
    );

    // Calculate business profile
    const businessProfile = this.buildBusinessProfile(parsedData);
    
    // Extract key drivers for chat (exclude balance sheet items)
    const keyDrivers = driverResult.drivers
      .filter(driver => driver.category === 'revenue' || driver.category === 'expense')
      .slice(0, 5)
      .map(driver => ({
        name: driver.name,
        category: driver.category as 'revenue' | 'expense',
        materiality: driver.materiality,
        confidence: driver.confidence
      }));

    // Calculate trends
    const recentTrends = this.calculateRecentTrends(parsedData);

    return {
      businessProfile,
      keyDrivers,
      insights: {
        primary: insights.primary?.message || insights.primary || 'No primary insight available',
        validation: insights.validation?.message || insights.validation || 'No validation available', 
        opportunity: insights.opportunity?.message || insights.opportunity || 'No opportunity identified'
      },
      recentTrends
    };
  }

  /**
   * Format chat context for AI consumption
   */
  formatForAI(context: ChatContext): string {
    const { businessProfile, keyDrivers, insights, recentTrends } = context;
    
    const dataFreshnessWarning = businessProfile.dataQuality.missingRecentData 
      ? `\n🚨 DATA GAP: Recent months (Jun-Aug 2025) show no activity. Historical data available through May 2025.\n`
      : '';
    
    // Debug logging for materiality percentages
    console.log('🔍 DEBUG: keyDrivers before formatting:', keyDrivers);
    keyDrivers.forEach(d => {
      console.log(`  - ${d.name}: raw materiality = ${d.materiality}, formatted = ${d.materiality.toFixed(1)}% (no longer multiplying by 100)`);
    });
    
    const formattedContext = `BUSINESS PROFILE:
- Company: ${businessProfile.name} (${businessProfile.industry})
- Recent Monthly Revenue: $${(businessProfile.monthlyRevenue / 1000).toFixed(1)}K (last 3 months average)
- Historical Data: ${businessProfile.dataQuality.monthsOfData} months of rich financial data
- Data Quality: ${businessProfile.dataQuality.reliability}${dataFreshnessWarning}

KEY BUSINESS DRIVERS (from historical analysis):
${keyDrivers.map(d => `- ${d.name}: ${d.materiality.toFixed(1)}% materiality (${d.confidence} confidence)`).join('\n')}

DRIVER DISCOVERY CALCULATION METHODOLOGY:
Base materiality formula: materiality = lineItem.total / companyTotal across ${businessProfile.dataQuality.monthsOfData} months of data.

COMPOSITE SCORING ALGORITHM:
Each driver gets a composite score using this weighted formula:
score = (materiality × 0.3) + (variability × 0.2) + (predictability × 0.2) + (growthImpact × 0.2) + (dataQuality × 0.1)

DETAILED METRIC CALCULATIONS:
• Materiality (30% weight): lineItem.total / companyTotal - measures relative business size
• Variability (20% weight): coefficientOfVariation = stdDev(monthlyValues) / mean(monthlyValues), normalized 0-1 - measures volatility
• Predictability (20% weight): R² correlation from linear regression on historical trend - measures forecastability
• Growth Impact (20% weight): clamp(Math.abs(CAGR) × 5, 0, 1) - measures growth significance
• Data Quality (10% weight): nonZeroMonths / totalMonths - measures data completeness

SELECTION CRITERIA:
Drivers must meet ALL requirements to be included:
✓ Composite score > 0.4 (overall importance threshold)
✓ Materiality > 1% (minimum business impact)
✓ Data quality > 50% (at least 6 months of non-zero data)
✓ Not highly correlated (>0.8) with already selected drivers

For example: "Plants and Soil" at 26.0% materiality scored above 0.4 composite and represents 26% of your total ${businessProfile.dataQuality.monthsOfData}-month business activity.

BUSINESS INSIGHTS:
- Primary Concern: ${insights.primary}
- Validation: ${insights.validation}
- Opportunity: ${insights.opportunity}

HISTORICAL TRENDS:
- Revenue: ${recentTrends.revenue.trend} (${recentTrends.revenue.growth > 0 ? '+' : ''}${recentTrends.revenue.growth.toFixed(1)}%)
- Expenses: ${recentTrends.expenses.trend} (${recentTrends.expenses.growth > 0 ? '+' : ''}${recentTrends.expenses.growth.toFixed(1)}%)`;
    
    console.log('📋 DEBUG: Full business context being sent to AI:');
    console.log(formattedContext);
    
    return formattedContext;
  }

  private buildBusinessProfile(parsedData: any): BusinessProfile {
    // Get ALL data - zeros are meaningful data points
    const allRevenue = parsedData.revenue.monthlyTotals;
    const lastThreeMonths = allRevenue.slice(-3);
    const missingRecentData = lastThreeMonths.every((month: any) => month.value === 0);
    
    console.log('🔍 DEBUG: Last 3 months data:', lastThreeMonths);
    console.log('🚨 DEBUG: Missing recent data?', missingRecentData);
    
    // Calculate average including zeros - they represent actual business state
    const monthlyRevenue = lastThreeMonths.reduce((sum: number, month: any) => sum + month.value, 0) / lastThreeMonths.length;
    
    console.log('🔍 DEBUG: Calculated monthly revenue (including zeros):', monthlyRevenue);
    
    return {
      name: "Your Business", // Could be extracted from QB company info
      industry: "Service Business", // Could be detected from expense patterns
      monthlyRevenue,
      dataQuality: {
        monthsOfData: parsedData.revenue.monthlyTotals.length,
        reliability: parsedData.revenue.monthlyTotals.length >= 12 ? 'high' : 
                   parsedData.revenue.monthlyTotals.length >= 6 ? 'medium' : 'low',
        missingRecentData,
        lastDataMonth: allRevenue.length > 0 ? allRevenue[allRevenue.length - 1].month : 'unknown'
      }
    };
  }

  private calculateRecentTrends(parsedData: any): any {
    const revenueData = parsedData.revenue.monthlyTotals;
    const expenseData = parsedData.expenses.monthlyTotals;
    
    if (revenueData.length < 2) {
      return {
        revenue: { growth: 0, trend: 'insufficient data' },
        expenses: { growth: 0, trend: 'insufficient data' }
      };
    }

    // Use ALL data including zeros - they represent actual business performance
    const recent = revenueData.slice(-3);
    const previous = revenueData.slice(-6, -3);
    
    const recentAvg = recent.reduce((sum: number, month: any) => sum + month.value, 0) / recent.length;
    const previousAvg = previous.length > 0 ? 
      previous.reduce((sum: number, month: any) => sum + month.value, 0) / previous.length : recentAvg;
    
    const revenueGrowth = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    // Same for expenses - use ALL expense data
    const recentExpenses = expenseData.slice(-3);
    const previousExpenses = expenseData.slice(-6, -3);
    
    const recentExpenseAvg = recentExpenses.reduce((sum: number, month: any) => sum + month.value, 0) / recentExpenses.length;
    const previousExpenseAvg = previousExpenses.length > 0 ?
      previousExpenses.reduce((sum: number, month: any) => sum + month.value, 0) / previousExpenses.length : recentExpenseAvg;
    
    const expenseGrowth = previousExpenseAvg > 0 ? ((recentExpenseAvg - previousExpenseAvg) / previousExpenseAvg) * 100 : 0;

    return {
      revenue: {
        growth: revenueGrowth,
        trend: revenueGrowth > 5 ? 'growing' : revenueGrowth < -5 ? 'declining' : 'stable'
      },
      expenses: {
        growth: expenseGrowth,
        trend: expenseGrowth > 5 ? 'increasing' : expenseGrowth < -5 ? 'decreasing' : 'stable'
      }
    };
  }
}