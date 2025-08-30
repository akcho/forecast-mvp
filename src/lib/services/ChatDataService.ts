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
    
    // Extract key drivers for chat
    const keyDrivers = driverResult.drivers.slice(0, 5).map(driver => ({
      name: driver.name,
      category: driver.category,
      materiality: driver.materiality,
      confidence: driver.confidence
    }));

    // Calculate trends
    const recentTrends = this.calculateRecentTrends(parsedData);

    return {
      businessProfile,
      keyDrivers,
      insights: {
        primary: insights.primary.message,
        validation: insights.validation.message,
        opportunity: insights.opportunity.message
      },
      recentTrends
    };
  }

  /**
   * Format chat context for AI consumption
   */
  formatForAI(context: ChatContext): string {
    const { businessProfile, keyDrivers, insights, recentTrends } = context;
    
    return `BUSINESS PROFILE:
- Company: ${businessProfile.name} (${businessProfile.industry})
- Monthly Revenue: $${(businessProfile.monthlyRevenue / 1000).toFixed(1)}K
- Data Quality: ${businessProfile.dataQuality.reliability} (${businessProfile.dataQuality.monthsOfData} months)

KEY BUSINESS DRIVERS:
${keyDrivers.map(d => `- ${d.name}: ${(d.materiality * 100).toFixed(1)}% materiality (${d.confidence} confidence)`).join('\n')}

CURRENT INSIGHTS:
- Primary Concern: ${insights.primary}
- Validation: ${insights.validation}
- Opportunity: ${insights.opportunity}

RECENT TRENDS:
- Revenue: ${recentTrends.revenue.trend} (${recentTrends.revenue.growth > 0 ? '+' : ''}${recentTrends.revenue.growth.toFixed(1)}%)
- Expenses: ${recentTrends.expenses.trend} (${recentTrends.expenses.growth > 0 ? '+' : ''}${recentTrends.expenses.growth.toFixed(1)}%)`;
  }

  private buildBusinessProfile(parsedData: any): BusinessProfile {
    // Calculate average monthly revenue
    const recentRevenue = parsedData.revenue.monthlyData.slice(-3);
    const monthlyRevenue = recentRevenue.reduce((sum: number, month: any) => sum + month.amount, 0) / recentRevenue.length;
    
    return {
      name: "Your Business", // Could be extracted from QB company info
      industry: "Service Business", // Could be detected from expense patterns
      monthlyRevenue,
      dataQuality: {
        monthsOfData: parsedData.revenue.monthlyData.length,
        reliability: parsedData.revenue.monthlyData.length >= 12 ? 'high' : 
                   parsedData.revenue.monthlyData.length >= 6 ? 'medium' : 'low'
      }
    };
  }

  private calculateRecentTrends(parsedData: any): any {
    const revenueData = parsedData.revenue.monthlyData;
    const expenseData = parsedData.expenses.monthlyData;
    
    if (revenueData.length < 2) {
      return {
        revenue: { growth: 0, trend: 'insufficient data' },
        expenses: { growth: 0, trend: 'insufficient data' }
      };
    }

    // Compare last 3 months to previous 3 months
    const recent = revenueData.slice(-3);
    const previous = revenueData.slice(-6, -3);
    
    const recentAvg = recent.reduce((sum: number, month: any) => sum + month.amount, 0) / recent.length;
    const previousAvg = previous.length > 0 ? 
      previous.reduce((sum: number, month: any) => sum + month.amount, 0) / previous.length : recentAvg;
    
    const revenueGrowth = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    // Same for expenses
    const recentExpenses = expenseData.slice(-3);
    const previousExpenses = expenseData.slice(-6, -3);
    
    const recentExpenseAvg = recentExpenses.reduce((sum: number, month: any) => sum + month.amount, 0) / recentExpenses.length;
    const previousExpenseAvg = previousExpenses.length > 0 ?
      previousExpenses.reduce((sum: number, month: any) => sum + month.amount, 0) / previousExpenses.length : recentExpenseAvg;
    
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