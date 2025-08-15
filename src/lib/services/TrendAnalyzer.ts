/**
 * TrendAnalyzer - Analyzes historical financial trends for forecasting
 * Extracts growth rates, seasonality, and business patterns from QB data
 */

import { ParsedProfitLoss, MonthlyValue } from '../types/financialModels';

export interface TrendAnalysis {
  // Growth rates
  monthlyGrowthRate: number;      // Average month-over-month growth %
  annualizedGrowthRate: number;   // Annualized growth rate %
  quarterlyGrowthRates: number[]; // Q-over-Q growth for seasonal analysis
  
  // Trend patterns
  trendDirection: 'growth' | 'decline' | 'stable' | 'volatile';
  seasonalityScore: number;       // 0-1, higher = more seasonal
  volatilityScore: number;        // Standard deviation / mean
  
  // Business insights
  peakMonths: string[];           // Months with highest activity
  lowMonths: string[];            // Months with lowest activity
  averageMonthlyRevenue: number;
  averageMonthlyExpenses: number;
  averageNetMargin: number;       // %
  
  // Forecasting inputs
  recommendedGrowthRate: number;  // Conservative growth rate for forecasting
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface ExpenseBreakdown {
  fixedCosts: {
    monthlyAverage: number;
    variability: number;        // How much fixed costs vary month-to-month
    accounts: string[];
  };
  variableCosts: {
    asPercentOfRevenue: number; // Variable costs as % of revenue
    correlation: number;        // Correlation with revenue (0-1)
    accounts: string[];
  };
  seasonalCosts: {
    accounts: string[];
    peakMonths: string[];
  };
}

export class TrendAnalyzer {
  
  /**
   * Analyze revenue trends from historical P&L data
   */
  analyzeRevenueTrends(data: ParsedProfitLoss): TrendAnalysis {
    const monthlyRevenue = data.revenue.monthlyTotals;
    
    // Calculate growth rates
    const monthlyGrowthRates = this.calculateGrowthRates(monthlyRevenue);
    const monthlyGrowthRate = this.averageGrowthRate(monthlyGrowthRates);
    const annualizedGrowthRate = Math.pow(1 + monthlyGrowthRate / 100, 12) - 1;
    
    // Quarterly analysis for seasonality
    const quarterlyData = this.groupByQuarter(monthlyRevenue);
    const quarterlyGrowthRates = this.calculateQuarterlyGrowth(quarterlyData);
    
    // Trend direction analysis
    const trendDirection = this.determineTrendDirection(monthlyGrowthRates);
    const volatilityScore = this.calculateVolatility(monthlyRevenue.map(m => m.value));
    const seasonalityScore = this.calculateSeasonality(monthlyRevenue);
    
    // Business insights
    const sortedMonths = [...monthlyRevenue].sort((a, b) => b.value - a.value);
    const peakMonths = sortedMonths.slice(0, 3).map(m => m.month);
    const lowMonths = sortedMonths.slice(-3).map(m => m.month);
    
    const averageMonthlyRevenue = monthlyRevenue.reduce((sum, m) => sum + m.value, 0) / monthlyRevenue.length;
    const averageMonthlyExpenses = data.expenses.monthlyTotals.reduce((sum, m) => sum + m.value, 0) / data.expenses.monthlyTotals.length;
    const averageNetMargin = averageMonthlyRevenue > 0 ? ((averageMonthlyRevenue - averageMonthlyExpenses) / averageMonthlyRevenue) * 100 : 0;
    
    // Forecasting recommendations
    const { recommendedGrowthRate, confidenceLevel } = this.generateForecastingRecommendations(
      monthlyGrowthRate, volatilityScore, monthlyRevenue.length
    );
    
    return {
      monthlyGrowthRate,
      annualizedGrowthRate: annualizedGrowthRate * 100,
      quarterlyGrowthRates,
      trendDirection,
      seasonalityScore,
      volatilityScore,
      peakMonths,
      lowMonths,
      averageMonthlyRevenue,
      averageMonthlyExpenses,
      averageNetMargin,
      recommendedGrowthRate,
      confidenceLevel
    };
  }
  
  /**
   * Analyze expense patterns for cost forecasting
   */
  analyzeExpenseStructure(data: ParsedProfitLoss): ExpenseBreakdown {
    const expenseLines = data.expenses.lines.filter(line => line.type !== 'summary');
    const monthlyRevenue = data.revenue.monthlyTotals.map(m => m.value);
    
    const fixedCosts: string[] = [];
    const variableCosts: string[] = [];
    const seasonalCosts: string[] = [];
    
    let totalFixedCost = 0;
    let totalVariableCost = 0;
    
    // Analyze each expense line
    expenseLines.forEach(line => {
      const monthlyValues = line.monthlyValues.map(m => m.value);
      const variability = this.calculateVolatility(monthlyValues);
      const correlation = this.calculateCorrelation(monthlyValues, monthlyRevenue);
      
      // Classification logic
      if (variability < 0.2) {
        // Low variability = likely fixed cost
        fixedCosts.push(line.accountName);
        totalFixedCost += line.total;
      } else if (correlation > 0.6) {
        // High correlation with revenue = variable cost
        variableCosts.push(line.accountName);
        totalVariableCost += line.total;
      } else if (this.hasSeasonalPattern(monthlyValues)) {
        // Seasonal pattern detected
        seasonalCosts.push(line.accountName);
      }
    });
    
    const totalRevenue = data.revenue.grandTotal;
    const totalExpenses = data.expenses.grandTotal;
    
    return {
      fixedCosts: {
        monthlyAverage: totalFixedCost / data.period.months.length,
        variability: this.calculateVolatility(data.expenses.monthlyTotals.map(m => m.value)),
        accounts: fixedCosts
      },
      variableCosts: {
        asPercentOfRevenue: totalRevenue > 0 ? (totalVariableCost / totalRevenue) * 100 : 0,
        correlation: this.calculateCorrelation(
          data.expenses.monthlyTotals.map(m => m.value),
          monthlyRevenue
        ),
        accounts: variableCosts
      },
      seasonalCosts: {
        accounts: seasonalCosts,
        peakMonths: this.findPeakSeasonalMonths(data.expenses.monthlyTotals)
      }
    };
  }
  
  // Helper methods
  private calculateGrowthRates(monthlyData: MonthlyValue[]): number[] {
    const growthRates: number[] = [];
    
    for (let i = 1; i < monthlyData.length; i++) {
      const current = monthlyData[i].value;
      const previous = monthlyData[i - 1].value;
      
      if (previous > 0) {
        const growthRate = ((current - previous) / previous) * 100;
        growthRates.push(growthRate);
      }
    }
    
    return growthRates;
  }
  
  private averageGrowthRate(growthRates: number[]): number {
    if (growthRates.length === 0) return 0;
    return growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
  }
  
  private groupByQuarter(monthlyData: MonthlyValue[]): MonthlyValue[][] {
    const quarters: MonthlyValue[][] = [[], [], [], []];
    
    monthlyData.forEach(month => {
      const monthNum = month.date.getMonth();
      const quarter = Math.floor(monthNum / 3);
      quarters[quarter].push(month);
    });
    
    return quarters.filter(q => q.length > 0);
  }
  
  private calculateQuarterlyGrowth(quarterlyData: MonthlyValue[][]): number[] {
    return quarterlyData.map(quarter => {
      const quarterTotal = quarter.reduce((sum, month) => sum + month.value, 0);
      return quarterTotal;
    });
  }
  
  private determineTrendDirection(growthRates: number[]): 'growth' | 'decline' | 'stable' | 'volatile' {
    if (growthRates.length < 3) return 'stable';
    
    const avgGrowth = this.averageGrowthRate(growthRates);
    const volatility = this.calculateVolatility(growthRates);
    
    if (volatility > 50) return 'volatile';
    if (avgGrowth > 5) return 'growth';
    if (avgGrowth < -5) return 'decline';
    return 'stable';
  }
  
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? (stdDev / mean) : 0;
  }
  
  private calculateSeasonality(monthlyData: MonthlyValue[]): number {
    // Simple seasonality score based on coefficient of variation
    const values = monthlyData.map(m => m.value);
    const volatility = this.calculateVolatility(values);
    
    // Normalize to 0-1 scale (higher volatility = more seasonal)
    return Math.min(volatility, 1);
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
  
  private hasSeasonalPattern(monthlyValues: number[]): boolean {
    // Simple seasonal detection - look for patterns that repeat
    const volatility = this.calculateVolatility(monthlyValues);
    return volatility > 0.3; // Threshold for seasonal classification
  }
  
  private findPeakSeasonalMonths(monthlyData: MonthlyValue[]): string[] {
    const sorted = [...monthlyData].sort((a, b) => b.value - a.value);
    return sorted.slice(0, 2).map(m => m.month);
  }
  
  private generateForecastingRecommendations(
    monthlyGrowthRate: number, 
    volatility: number, 
    dataPoints: number
  ): { recommendedGrowthRate: number; confidenceLevel: 'high' | 'medium' | 'low' } {
    let recommendedGrowthRate = monthlyGrowthRate;
    let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
    
    // Apply conservative adjustments
    if (volatility > 0.5) {
      recommendedGrowthRate *= 0.7; // Reduce by 30% for high volatility
      confidenceLevel = 'low';
    } else if (volatility > 0.3) {
      recommendedGrowthRate *= 0.85; // Reduce by 15% for medium volatility
    } else {
      confidenceLevel = 'high';
    }
    
    // Adjust for data sufficiency
    if (dataPoints < 6) {
      recommendedGrowthRate *= 0.8;
      confidenceLevel = 'low';
    }
    
    // Cap at reasonable levels
    recommendedGrowthRate = Math.max(-10, Math.min(15, recommendedGrowthRate));
    
    return { recommendedGrowthRate, confidenceLevel };
  }
}