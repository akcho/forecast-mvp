/**
 * ExpenseCategorizer - Advanced expense categorization and inflation modeling
 * Enhances forecasting with detailed expense behavior analysis
 */

import { ParsedProfitLoss, MonthlyFinancialLine } from '../types/financialModels';
import { TrendAnalysis, ExpenseBreakdown } from './TrendAnalyzer';

export interface ExpenseCategory {
  categoryName: string;
  accounts: string[];
  behavior: 'fixed' | 'variable' | 'stepped' | 'seasonal';
  
  // Cost behavior metrics
  monthlyAverage: number;
  variability: number;           // Coefficient of variation
  revenueCorrelation: number;    // Correlation with revenue (-1 to 1)
  
  // Forecasting parameters
  inflationRate: number;         // Annual inflation rate %
  scalingFactor: number;         // How it scales with revenue (for variable costs)
  seasonalPattern?: {            // Optional seasonal adjustment
    peakMonths: string[];
    multiplier: number;
  };
}

export interface InflationAssumptions {
  generalInflation: number;      // General CPI inflation %
  laborInflation: number;        // Wage/salary inflation %
  materialInflation: number;     // Materials/supplies inflation %
  utilityInflation: number;      // Utilities inflation %
  rentInflation: number;         // Rent/lease inflation %
  
  // Economic scenario adjustments
  scenario: 'baseline' | 'high_inflation' | 'low_inflation';
}

export interface CategorizedExpenses {
  categories: ExpenseCategory[];
  inflationAssumptions: InflationAssumptions;
  
  // Summary metrics
  totalFixedCosts: number;
  totalVariableCosts: number;
  totalSeasonalCosts: number;
  uncategorizedCosts: number;
  
  // Forecasting readiness
  forecastingMetrics: {
    categorizedPercentage: number;  // % of expenses successfully categorized
    averageCorrelation: number;     // Average revenue correlation
    inflationCoverage: number;      // % of costs with inflation assumptions
  };
}

export class ExpenseCategorizer {
  
  /**
   * Categorize all expenses with detailed behavior analysis
   */
  categorizeExpenses(
    parsedData: ParsedProfitLoss,
    trendAnalysis: TrendAnalysis,
    expenseBreakdown: ExpenseBreakdown
  ): CategorizedExpenses {
    
    const monthlyRevenue = parsedData.revenue.monthlyTotals.map(m => m.value);
    const categories: ExpenseCategory[] = [];
    
    let totalCategorized = 0;
    let totalCorrelationSum = 0;
    let categorizedCount = 0;
    
    // Process each expense line
    parsedData.expenses.lines
      .filter(line => line.type !== 'summary')
      .forEach(line => {
        const category = this.categorizeExpenseLine(line, monthlyRevenue);
        if (category) {
          categories.push(category);
          totalCategorized += category.monthlyAverage;
          totalCorrelationSum += Math.abs(category.revenueCorrelation);
          categorizedCount++;
        }
      });
    
    // Create inflation assumptions
    const inflationAssumptions = this.createInflationAssumptions(trendAnalysis);
    
    // Calculate summary metrics
    const summary = this.calculateCategoryMetrics(categories, parsedData.expenses.grandTotal);
    
    return {
      categories,
      inflationAssumptions,
      ...summary,
      forecastingMetrics: {
        categorizedPercentage: (totalCategorized / parsedData.expenses.grandTotal) * 100,
        averageCorrelation: categorizedCount > 0 ? totalCorrelationSum / categorizedCount : 0,
        inflationCoverage: 100 // All categories get inflation assumptions
      }
    };
  }
  
  /**
   * Categorize individual expense line with behavior analysis
   */
  private categorizeExpenseLine(
    line: MonthlyFinancialLine,
    monthlyRevenue: number[]
  ): ExpenseCategory | null {
    
    if (line.monthlyValues.length === 0) return null;
    
    const monthlyValues = line.monthlyValues.map(m => m.value);
    const monthlyAverage = monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length;
    
    // Calculate behavior metrics
    const variability = this.calculateVariability(monthlyValues);
    const revenueCorrelation = this.calculateCorrelation(monthlyValues, monthlyRevenue);
    const behavior = this.determineBehavior(variability, revenueCorrelation, monthlyValues);
    
    // Determine inflation rate based on account type
    const inflationRate = this.determineInflationRate(line.accountName, behavior);
    
    // Calculate scaling factor for variable costs
    const scalingFactor = behavior === 'variable' ? 
      Math.abs(revenueCorrelation) : 0;
    
    // Detect seasonal patterns
    const seasonalPattern = this.detectSeasonalPattern(line.monthlyValues);
    
    return {
      categoryName: this.categorizeName(line.accountName),
      accounts: [line.accountName],
      behavior,
      monthlyAverage,
      variability,
      revenueCorrelation,
      inflationRate,
      scalingFactor,
      seasonalPattern
    };
  }
  
  /**
   * Determine expense behavior type
   */
  private determineBehavior(
    variability: number,
    revenueCorrelation: number,
    monthlyValues: number[]
  ): 'fixed' | 'variable' | 'stepped' | 'seasonal' {
    
    // High correlation with revenue = variable cost
    if (Math.abs(revenueCorrelation) > 0.7) {
      return 'variable';
    }
    
    // Low variability = fixed cost
    if (variability < 0.15) {
      return 'fixed';
    }
    
    // Check for stepped pattern (sudden jumps)
    const hasSteps = this.detectSteppedPattern(monthlyValues);
    if (hasSteps) {
      return 'stepped';
    }
    
    // High variability but low correlation = seasonal
    return 'seasonal';
  }
  
  /**
   * Determine appropriate inflation rate by expense type
   */
  private determineInflationRate(accountName: string, behavior: string): number {
    const name = accountName.toLowerCase();
    
    // Labor-related expenses
    if (name.includes('salary') || name.includes('wage') || name.includes('payroll') || 
        name.includes('labor') || name.includes('employee')) {
      return 4.5; // Higher wage inflation
    }
    
    // Rent and facilities
    if (name.includes('rent') || name.includes('lease') || name.includes('office')) {
      return 3.8; // Commercial rent inflation
    }
    
    // Utilities
    if (name.includes('electric') || name.includes('gas') || name.includes('water') ||
        name.includes('utility') || name.includes('phone') || name.includes('internet')) {
      return 4.2; // Utility inflation
    }
    
    // Materials and supplies
    if (name.includes('material') || name.includes('supply') || name.includes('equipment') ||
        name.includes('tools') || name.includes('parts')) {
      return 3.5; // Materials inflation
    }
    
    // Insurance
    if (name.includes('insurance')) {
      return 5.0; // Insurance premium inflation
    }
    
    // Variable costs typically have lower inflation
    if (behavior === 'variable') {
      return 2.8; // Lower inflation for variable costs
    }
    
    // Default general inflation
    return 3.2;
  }
  
  /**
   * Categorize expense name into business category
   */
  private categorizeName(accountName: string): string {
    const name = accountName.toLowerCase();
    
    if (name.includes('salary') || name.includes('wage') || name.includes('payroll') || name.includes('labor')) {
      return 'Labor & Wages';
    }
    if (name.includes('rent') || name.includes('lease') || name.includes('office')) {
      return 'Facilities & Rent';
    }
    if (name.includes('material') || name.includes('supply') || name.includes('equipment')) {
      return 'Materials & Supplies';
    }
    if (name.includes('marketing') || name.includes('advertising')) {
      return 'Marketing & Sales';
    }
    if (name.includes('insurance')) {
      return 'Insurance';
    }
    if (name.includes('utility') || name.includes('phone') || name.includes('internet')) {
      return 'Utilities & Communications';
    }
    if (name.includes('travel') || name.includes('fuel') || name.includes('vehicle')) {
      return 'Transportation';
    }
    if (name.includes('professional') || name.includes('legal') || name.includes('accounting')) {
      return 'Professional Services';
    }
    
    return 'Other Operating Expenses';
  }
  
  /**
   * Create inflation assumptions based on economic scenario
   */
  private createInflationAssumptions(trendAnalysis: TrendAnalysis): InflationAssumptions {
    const baseRates = {
      generalInflation: 3.2,
      laborInflation: 4.5,
      materialInflation: 3.5,
      utilityInflation: 4.2,
      rentInflation: 3.8
    };
    
    // Adjust based on business volatility and trends
    const volatilityMultiplier = trendAnalysis.volatilityScore > 0.5 ? 1.2 : 1.0;
    const scenario = trendAnalysis.volatilityScore > 0.5 ? 'high_inflation' : 'baseline';
    
    return {
      ...Object.fromEntries(
        Object.entries(baseRates).map(([key, rate]) => [key, rate * volatilityMultiplier])
      ) as Omit<InflationAssumptions, 'scenario'>,
      scenario
    };
  }
  
  // Helper methods
  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? stdDev / mean : 0;
  }
  
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - meanX;
      const yDiff = y[i] - meanY;
      
      numerator += xDiff * yDiff;
      sumXSquared += xDiff * xDiff;
      sumYSquared += yDiff * yDiff;
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  private detectSteppedPattern(monthlyValues: number[]): boolean {
    if (monthlyValues.length < 3) return false;
    
    let stepChanges = 0;
    for (let i = 1; i < monthlyValues.length; i++) {
      const percentChange = Math.abs((monthlyValues[i] - monthlyValues[i-1]) / (monthlyValues[i-1] || 1));
      if (percentChange > 0.5) { // 50% change indicates a step
        stepChanges++;
      }
    }
    
    return stepChanges >= 2; // At least 2 significant steps
  }
  
  private detectSeasonalPattern(monthlyValues: any[]): { peakMonths: string[]; multiplier: number } | undefined {
    if (monthlyValues.length < 6) return undefined;
    
    const values = monthlyValues.map(m => m.value);
    const maxValue = Math.max(...values);
    const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // If peak is significantly higher than average, it's seasonal
    if (maxValue > avgValue * 1.5) {
      const peakIndices = values
        .map((val, idx) => ({ val, idx }))
        .filter(item => item.val > avgValue * 1.3)
        .map(item => monthlyValues[item.idx].month);
      
      return {
        peakMonths: peakIndices,
        multiplier: maxValue / avgValue
      };
    }
    
    return undefined;
  }
  
  private calculateCategoryMetrics(categories: ExpenseCategory[], totalExpenses: number) {
    let totalFixed = 0;
    let totalVariable = 0;
    let totalSeasonal = 0;
    
    categories.forEach(category => {
      const monthlyAmount = category.monthlyAverage;
      
      switch (category.behavior) {
        case 'fixed':
          totalFixed += monthlyAmount;
          break;
        case 'variable':
          totalVariable += monthlyAmount;
          break;
        case 'seasonal':
        case 'stepped':
          totalSeasonal += monthlyAmount;
          break;
      }
    });
    
    const totalCategorized = totalFixed + totalVariable + totalSeasonal;
    
    return {
      totalFixedCosts: totalFixed,
      totalVariableCosts: totalVariable,
      totalSeasonalCosts: totalSeasonal,
      uncategorizedCosts: Math.max(0, totalExpenses - totalCategorized)
    };
  }
}