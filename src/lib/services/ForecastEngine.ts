/**
 * ForecastEngine - Core forecasting engine with 3-scenario growth modeling
 * Applies growth assumptions to historical data for 12-month forecasting
 */

import { ParsedProfitLoss } from '../types/financialModels';
import { TrendAnalysis, ExpenseBreakdown } from './TrendAnalyzer';
import { CategorizedExpenses, ExpenseCategory } from './ExpenseCategorizer';

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
  expensesByCategory: {         // Detailed expense breakdown
    [categoryName: string]: number;
  };
  totalExpenses: number;
  netIncome: number;
  
  // Calculations metadata
  growthApplied: number;        // Growth rate applied this month
  seasonalMultiplier: number;   // Seasonal adjustment factor
  inflationAdjustments: {       // Inflation applied by category
    [categoryName: string]: number;
  };
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
   * Generate enhanced 3-scenario forecasts with detailed expense categorization
   */
  generateEnhancedThreeScenarioForecast(
    historicalData: ParsedProfitLoss,
    trendAnalysis: TrendAnalysis,
    categorizedExpenses: CategorizedExpenses,
    monthsToForecast: number = 12
  ): ForecastResult[] {
    
    // Create enhanced growth assumptions using categorized expenses
    const baselineAssumptions = this.createEnhancedBaselineAssumptions(trendAnalysis, categorizedExpenses);
    const growthAssumptions = this.createEnhancedGrowthAssumptions(trendAnalysis, categorizedExpenses);
    const downturnAssumptions = this.createEnhancedDownturnAssumptions(trendAnalysis, categorizedExpenses);
    
    // Generate enhanced forecasts for each scenario
    return [
      this.generateEnhancedScenarioForecast(historicalData, baselineAssumptions, categorizedExpenses, monthsToForecast),
      this.generateEnhancedScenarioForecast(historicalData, growthAssumptions, categorizedExpenses, monthsToForecast),
      this.generateEnhancedScenarioForecast(historicalData, downturnAssumptions, categorizedExpenses, monthsToForecast)
    ];
  }
  
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
        expensesByCategory: {
          'Variable Costs': variableCosts,
          'Fixed Costs': fixedCosts
        },
        totalExpenses,
        netIncome,
        growthApplied: assumptions.monthlyGrowthRate,
        seasonalMultiplier,
        inflationAdjustments: {
          'Variable Costs': 0,
          'Fixed Costs': assumptions.fixedCostInflation
        }
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
  
  // Enhanced forecasting methods with detailed expense categorization
  
  /**
   * Generate enhanced forecast for a single scenario with detailed expenses
   */
  private generateEnhancedScenarioForecast(
    historicalData: ParsedProfitLoss,
    assumptions: GrowthAssumptions,
    categorizedExpenses: CategorizedExpenses,
    monthsToForecast: number
  ): ForecastResult {
    
    // Extract base metrics from historical data
    const historicalBase = this.extractHistoricalBase(historicalData, assumptions);
    
    // Generate enhanced monthly projections with detailed expenses
    const projections = this.projectEnhancedMonthlyFinancials(
      historicalBase,
      assumptions,
      categorizedExpenses,
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
   * Project enhanced monthly financials with category-level expense detail
   */
  private projectEnhancedMonthlyFinancials(
    historicalBase: any,
    assumptions: GrowthAssumptions,
    categorizedExpenses: CategorizedExpenses,
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
      
      // Calculate detailed expenses by category
      const expensesByCategory: { [categoryName: string]: number } = {};
      const inflationAdjustments: { [categoryName: string]: number } = {};
      let totalExpenses = 0;
      
      categorizedExpenses.categories.forEach(category => {
        const monthlyInflationFactor = Math.pow(1 + (category.inflationRate / 100), 1/12);
        const baseAmount = category.monthlyAverage;
        
        let projectedExpense = 0;
        
        switch (category.behavior) {
          case 'fixed':
            // Fixed costs grow only with inflation
            projectedExpense = baseAmount * Math.pow(monthlyInflationFactor, i + 1);
            break;
            
          case 'variable':
            // Variable costs scale with revenue and inflation
            const revenueRatio = projectedRevenue / historicalBase.averageMonthlyRevenue;
            projectedExpense = baseAmount * revenueRatio * Math.pow(monthlyInflationFactor, i + 1);
            break;
            
          case 'seasonal':
            // Seasonal costs with seasonal adjustments and inflation
            const categorySeasonalMultiplier = category.seasonalPattern?.peakMonths.includes(monthName) ? 
              (category.seasonalPattern?.multiplier || 1.0) : 1.0;
            projectedExpense = baseAmount * categorySeasonalMultiplier * Math.pow(monthlyInflationFactor, i + 1);
            break;
            
          case 'stepped':
            // Stepped costs - simplified to behave like fixed with higher volatility
            projectedExpense = baseAmount * Math.pow(monthlyInflationFactor, i + 1);
            break;
        }
        
        expensesByCategory[category.categoryName] = projectedExpense;
        inflationAdjustments[category.categoryName] = category.inflationRate;
        totalExpenses += projectedExpense;
      });
      
      const netIncome = projectedRevenue - totalExpenses;
      
      projections.push({
        month: monthName,
        date: forecastDate,
        scenario: assumptions.scenario,
        revenue: projectedRevenue,
        expensesByCategory,
        totalExpenses,
        netIncome,
        growthApplied: assumptions.monthlyGrowthRate,
        seasonalMultiplier,
        inflationAdjustments
      });
      
      // Update current revenue for next iteration
      currentRevenue = projectedRevenue;
    }
    
    return projections;
  }
  
  /**
   * Create enhanced baseline assumptions using categorized expenses
   */
  private createEnhancedBaselineAssumptions(
    trendAnalysis: TrendAnalysis,
    categorizedExpenses: CategorizedExpenses
  ): GrowthAssumptions {
    
    const monthlyGrowthRate = trendAnalysis.recommendedGrowthRate;
    
    const seasonalAdjustments = this.buildSeasonalAdjustments(
      trendAnalysis.peakMonths,
      trendAnalysis.lowMonths,
      1.0
    );
    
    // Use categorized variable cost ratio
    const variableCostRatio = (categorizedExpenses.totalVariableCosts / 
      (categorizedExpenses.totalFixedCosts + categorizedExpenses.totalVariableCosts)) * 100;
    
    return {
      scenario: 'baseline',
      monthlyGrowthRate,
      seasonalAdjustments,
      variableCostRatio,
      fixedCostInflation: categorizedExpenses.inflationAssumptions.generalInflation,
      marketConditions: 'stable',
      confidenceLevel: trendAnalysis.confidenceLevel
    };
  }
  
  /**
   * Create enhanced growth assumptions
   */
  private createEnhancedGrowthAssumptions(
    trendAnalysis: TrendAnalysis,
    categorizedExpenses: CategorizedExpenses
  ): GrowthAssumptions {
    
    const monthlyGrowthRate = trendAnalysis.recommendedGrowthRate * 1.5;
    
    const seasonalAdjustments = this.buildSeasonalAdjustments(
      trendAnalysis.peakMonths,
      trendAnalysis.lowMonths,
      1.2
    );
    
    const variableCostRatio = (categorizedExpenses.totalVariableCosts / 
      (categorizedExpenses.totalFixedCosts + categorizedExpenses.totalVariableCosts)) * 100 * 0.95;
    
    return {
      scenario: 'growth',
      monthlyGrowthRate,
      seasonalAdjustments,
      variableCostRatio,
      fixedCostInflation: categorizedExpenses.inflationAssumptions.generalInflation * 1.2,
      marketConditions: 'expanding',
      confidenceLevel: trendAnalysis.confidenceLevel === 'high' ? 'medium' : 'low'
    };
  }
  
  /**
   * Create enhanced downturn assumptions
   */
  private createEnhancedDownturnAssumptions(
    trendAnalysis: TrendAnalysis,
    categorizedExpenses: CategorizedExpenses
  ): GrowthAssumptions {
    
    const monthlyGrowthRate = Math.min(trendAnalysis.recommendedGrowthRate * 0.3, -2.0);
    
    const seasonalAdjustments = this.buildSeasonalAdjustments(
      trendAnalysis.peakMonths,
      trendAnalysis.lowMonths,
      0.8
    );
    
    const variableCostRatio = (categorizedExpenses.totalVariableCosts / 
      (categorizedExpenses.totalFixedCosts + categorizedExpenses.totalVariableCosts)) * 100 * 1.05;
    
    return {
      scenario: 'downturn',
      monthlyGrowthRate,
      seasonalAdjustments,
      variableCostRatio,
      fixedCostInflation: categorizedExpenses.inflationAssumptions.generalInflation * 0.7,
      marketConditions: 'contracting',
      confidenceLevel: 'medium'
    };
  }
}