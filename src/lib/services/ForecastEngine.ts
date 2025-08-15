/**
 * ForecastEngine - Core forecasting engine with 3-scenario growth modeling
 * Applies growth assumptions to historical data for 12-month forecasting
 */

import { ParsedProfitLoss } from '../types/financialModels';
import { TrendAnalysis, ExpenseBreakdown } from './TrendAnalyzer';

export type ForecastScenario = 'baseline' | 'growth' | 'downturn';

export interface GrowthAssumptions {
  scenario: ForecastScenario;
  
  // Revenue assumptions
  monthlyGrowthRate: number;     // Monthly growth rate %
  seasonalAdjustments: {         // Month-specific multipliers
    [month: string]: number;
  };
  
  // Expense assumptions
  variableCostRatio: number;     // Variable costs as % of revenue
  fixedCostInflation: number;    // Annual inflation rate for fixed costs %
  
  // Market assumptions
  marketConditions: 'stable' | 'expanding' | 'contracting';
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface ForecastedMonth {
  month: string;
  date: Date;
  scenario: ForecastScenario;
  
  // Projected financials
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  totalExpenses: number;
  netIncome: number;
  
  // Calculations metadata
  growthApplied: number;        // Growth rate applied this month
  seasonalMultiplier: number;   // Seasonal adjustment factor
}

export interface ForecastResult {
  scenario: ForecastScenario;
  assumptions: GrowthAssumptions;
  historicalBase: {
    lastMonthRevenue: number;
    averageMonthlyRevenue: number;
    variableCostRatio: number;
    fixedCostBase: number;
  };
  projections: ForecastedMonth[];
  summary: {
    totalProjectedRevenue: number;
    totalProjectedExpenses: number;
    totalNetIncome: number;
    averageMonthlyGrowth: number;
  };
}

export class ForecastEngine {
  
  /**
   * Generate 3-scenario forecasts based on historical data and trend analysis
   */
  generateThreeScenarioForecast(
    historicalData: ParsedProfitLoss,
    trendAnalysis: TrendAnalysis,
    expenseBreakdown: ExpenseBreakdown,
    monthsToForecast: number = 12
  ): ForecastResult[] {
    
    // Create growth assumptions for each scenario
    const baselineAssumptions = this.createBaselineAssumptions(trendAnalysis, expenseBreakdown);
    const growthAssumptions = this.createGrowthAssumptions(trendAnalysis, expenseBreakdown);
    const downturnAssumptions = this.createDownturnAssumptions(trendAnalysis, expenseBreakdown);
    
    // Generate forecasts for each scenario
    return [
      this.generateScenarioForecast(historicalData, baselineAssumptions, monthsToForecast),
      this.generateScenarioForecast(historicalData, growthAssumptions, monthsToForecast),
      this.generateScenarioForecast(historicalData, downturnAssumptions, monthsToForecast)
    ];
  }
  
  /**
   * Generate forecast for a single scenario
   */
  generateScenarioForecast(
    historicalData: ParsedProfitLoss,
    assumptions: GrowthAssumptions,
    monthsToForecast: number
  ): ForecastResult {
    
    // Extract base metrics from historical data
    const historicalBase = this.extractHistoricalBase(historicalData, assumptions);
    
    // Generate monthly projections
    const projections = this.projectMonthlyFinancials(
      historicalBase,
      assumptions,
      monthsToForecast
    );
    
    // Calculate summary metrics
    const summary = this.calculateForecastSummary(projections);
    
    return {
      scenario: assumptions.scenario,
      assumptions,
      historicalBase,
      projections,
      summary
    };
  }
  
  /**
   * Create baseline scenario assumptions (conservative growth)
   */
  private createBaselineAssumptions(
    trendAnalysis: TrendAnalysis,
    expenseBreakdown: ExpenseBreakdown
  ): GrowthAssumptions {
    
    // Use recommended growth rate (already conservative)
    const monthlyGrowthRate = trendAnalysis.recommendedGrowthRate;
    
    // Extract seasonal patterns from peak/low months
    const seasonalAdjustments = this.buildSeasonalAdjustments(
      trendAnalysis.peakMonths,
      trendAnalysis.lowMonths,
      1.0 // Baseline multiplier
    );
    
    return {
      scenario: 'baseline',
      monthlyGrowthRate,
      seasonalAdjustments,
      variableCostRatio: expenseBreakdown.variableCosts.asPercentOfRevenue,
      fixedCostInflation: 3.0, // Standard inflation assumption
      marketConditions: 'stable',
      confidenceLevel: trendAnalysis.confidenceLevel
    };
  }
  
  /**
   * Create growth scenario assumptions (optimistic expansion)
   */
  private createGrowthAssumptions(
    trendAnalysis: TrendAnalysis,
    expenseBreakdown: ExpenseBreakdown
  ): GrowthAssumptions {
    
    // Increase growth rate by 50% for optimistic scenario
    const monthlyGrowthRate = trendAnalysis.recommendedGrowthRate * 1.5;
    
    // Enhanced seasonal peaks for growth scenario
    const seasonalAdjustments = this.buildSeasonalAdjustments(
      trendAnalysis.peakMonths,
      trendAnalysis.lowMonths,
      1.2 // Growth multiplier
    );
    
    return {
      scenario: 'growth',
      monthlyGrowthRate,
      seasonalAdjustments,
      variableCostRatio: expenseBreakdown.variableCosts.asPercentOfRevenue * 0.95, // Slight efficiency gain
      fixedCostInflation: 4.0, // Higher inflation in growth scenario
      marketConditions: 'expanding',
      confidenceLevel: trendAnalysis.confidenceLevel === 'high' ? 'medium' : 'low' // Reduce confidence for optimistic projections
    };
  }
  
  /**
   * Create downturn scenario assumptions (defensive planning)
   */
  private createDownturnAssumptions(
    trendAnalysis: TrendAnalysis,
    expenseBreakdown: ExpenseBreakdown
  ): GrowthAssumptions {
    
    // Reduce growth rate significantly (or make negative)
    const monthlyGrowthRate = Math.min(trendAnalysis.recommendedGrowthRate * 0.3, -2.0);
    
    // Dampened seasonality for downturn
    const seasonalAdjustments = this.buildSeasonalAdjustments(
      trendAnalysis.peakMonths,
      trendAnalysis.lowMonths,
      0.8 // Downturn dampening
    );
    
    return {
      scenario: 'downturn',
      monthlyGrowthRate,
      seasonalAdjustments,
      variableCostRatio: expenseBreakdown.variableCosts.asPercentOfRevenue * 1.05, // Slight inefficiency
      fixedCostInflation: 2.0, // Lower inflation in recession
      marketConditions: 'contracting',
      confidenceLevel: 'medium' // Higher confidence in defensive scenarios
    };
  }
  
  /**
   * Build seasonal adjustment factors from historical patterns
   */
  private buildSeasonalAdjustments(
    peakMonths: string[],
    lowMonths: string[],
    baseMultiplier: number
  ): { [month: string]: number } {
    
    const adjustments: { [month: string]: number } = {};
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    // Default to baseline multiplier
    months.forEach(month => {
      adjustments[month] = baseMultiplier;
    });
    
    // Enhance peak months
    peakMonths.forEach(month => {
      adjustments[month] = baseMultiplier * 1.25;
    });
    
    // Reduce low months  
    lowMonths.forEach(month => {
      adjustments[month] = baseMultiplier * 0.75;
    });
    
    return adjustments;
  }
  
  /**
   * Extract historical base metrics for forecasting
   */
  private extractHistoricalBase(
    historicalData: ParsedProfitLoss,
    assumptions: GrowthAssumptions
  ) {
    const monthlyRevenue = historicalData.revenue.monthlyTotals;
    
    return {
      lastMonthRevenue: monthlyRevenue[monthlyRevenue.length - 1]?.value || 0,
      averageMonthlyRevenue: monthlyRevenue.reduce((sum, m) => sum + m.value, 0) / monthlyRevenue.length,
      variableCostRatio: assumptions.variableCostRatio,
      fixedCostBase: historicalData.expenses.monthlyTotals.reduce((sum, m) => sum + m.value, 0) / monthlyRevenue.length
    };
  }
  
  /**
   * Project monthly financials forward
   */
  private projectMonthlyFinancials(
    historicalBase: any,
    assumptions: GrowthAssumptions,
    monthsToForecast: number
  ): ForecastedMonth[] {
    
    const projections: ForecastedMonth[] = [];
    let currentRevenue = historicalBase.lastMonthRevenue;
    
    for (let i = 0; i < monthsToForecast; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      
      const monthName = forecastDate.toLocaleDateString('en-US', { month: 'short' });
      
      // Apply growth and seasonal adjustments
      const growthMultiplier = 1 + (assumptions.monthlyGrowthRate / 100);
      const seasonalMultiplier = assumptions.seasonalAdjustments[monthName] || 1.0;
      
      const projectedRevenue = currentRevenue * growthMultiplier * seasonalMultiplier;
      
      // Calculate expenses
      const variableCosts = projectedRevenue * (assumptions.variableCostRatio / 100);
      const monthlyInflationFactor = Math.pow(1 + (assumptions.fixedCostInflation / 100), 1/12);
      const fixedCosts = historicalBase.fixedCostBase * Math.pow(monthlyInflationFactor, i + 1);
      
      const totalExpenses = variableCosts + fixedCosts;
      const netIncome = projectedRevenue - totalExpenses;
      
      projections.push({
        month: monthName,
        date: forecastDate,
        scenario: assumptions.scenario,
        revenue: projectedRevenue,
        variableCosts,
        fixedCosts,
        totalExpenses,
        netIncome,
        growthApplied: assumptions.monthlyGrowthRate,
        seasonalMultiplier
      });
      
      // Update current revenue for next iteration
      currentRevenue = projectedRevenue;
    }
    
    return projections;
  }
  
  /**
   * Calculate summary metrics for forecast result
   */
  private calculateForecastSummary(projections: ForecastedMonth[]) {
    return {
      totalProjectedRevenue: projections.reduce((sum, p) => sum + p.revenue, 0),
      totalProjectedExpenses: projections.reduce((sum, p) => sum + p.totalExpenses, 0),
      totalNetIncome: projections.reduce((sum, p) => sum + p.netIncome, 0),
      averageMonthlyGrowth: projections.reduce((sum, p) => sum + p.growthApplied, 0) / projections.length
    };
  }
}