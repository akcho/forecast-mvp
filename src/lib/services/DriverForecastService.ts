/**
 * DriverForecastService - Core service for driver-based financial forecasting
 * Implements the flexible canvas approach from FORECAST_DESIGN.md
 */

import { DiscoveredDriver } from '@/types/driverTypes';
import {
  BaseForecast,
  AdjustedForecast,
  ProjectedDriver,
  MonthlyProjection,
  DriverAdjustment,
  ForecastSummary,
  ConfidenceMetrics,
  ScenarioComparison,
  Scenario,
  CalculationBreakdown,
  CalculationStep,
  ForecastValidationError
} from '@/types/forecastTypes';

export class DriverForecastService {

  /**
   * Generate base forecast from discovered drivers using historical trends
   */
  generateBaseForecast(
    drivers: DiscoveredDriver[], 
    monthsToProject: number = 12
  ): BaseForecast {
    console.log(`🔮 Generating base forecast for ${drivers.length} drivers over ${monthsToProject} months`);
    
    // Filter out balance sheet drivers (only use revenue/expense for forecasting)
    const forecastableDrivers = drivers.filter(driver => 
      driver.category === 'revenue' || driver.category === 'expense'
    );
    
    console.log(`📊 Using ${forecastableDrivers.length} forecastable drivers (filtered out ${drivers.length - forecastableDrivers.length} balance sheet drivers)`);
    
    // Project each driver forward using its historical trend
    const projectedDrivers = forecastableDrivers.map(driver => 
      this.projectDriverForward(driver, monthsToProject)
    );
    
    // Generate monthly projections by aggregating all drivers
    const monthlyProjections = this.generateMonthlyProjections(
      projectedDrivers, 
      monthsToProject
    );
    
    // Calculate summary metrics
    const summary = this.calculateForecastSummary(monthlyProjections, projectedDrivers);
    
    // Assess overall confidence
    const confidence = this.calculateConfidenceMetrics(forecastableDrivers, []);
    
    const forecast: BaseForecast = {
      drivers: projectedDrivers,
      monthlyProjections,
      summary,
      confidence,
      metadata: {
        generatedAt: new Date(),
        baseDataPeriod: {
          start: drivers[0]?.dateRange.start || new Date(),
          end: drivers[0]?.dateRange.end || new Date()
        },
        projectionPeriod: {
          start: new Date(),
          end: new Date(Date.now() + monthsToProject * 30 * 24 * 60 * 60 * 1000)
        }
      }
    };
    
    console.log(`✅ Base forecast generated: ${summary.totalProjectedRevenue.toLocaleString()} projected revenue`);
    return forecast;
  }

  /**
   * Apply user adjustments to base forecast
   */
  applyAdjustments(
    baseForecast: BaseForecast,
    adjustments: DriverAdjustment[]
  ): AdjustedForecast {
    console.log(`🎛️ Applying ${adjustments.length} adjustments to base forecast`);
    
    // Clone base drivers and apply adjustments
    const adjustedDrivers = baseForecast.drivers.map(driver => {
      const driverAdjustments = adjustments.filter(adj => adj.driverId === driver.name);
      if (driverAdjustments.length === 0) return driver;
      
      return this.applyDriverAdjustments(driver, driverAdjustments);
    });
    
    // Regenerate monthly projections with adjusted drivers
    const monthlyProjections = this.generateMonthlyProjections(
      adjustedDrivers, 
      baseForecast.monthlyProjections.length
    );
    
    // Recalculate summary with adjustments
    const summary = this.calculateForecastSummary(monthlyProjections, adjustedDrivers);
    
    // Reduce confidence based on adjustment complexity
    const confidence = this.calculateConfidenceMetrics(
      baseForecast.drivers.map(d => ({ name: d.name, confidence: d.confidence } as DiscoveredDriver)), 
      adjustments
    );
    
    // Calculate adjustment impact
    const adjustmentImpact = {
      totalRevenueChange: summary.totalProjectedRevenue - baseForecast.summary.totalProjectedRevenue,
      totalExpenseChange: summary.totalProjectedExpenses - baseForecast.summary.totalProjectedExpenses,
      netIncomeChange: summary.totalNetIncome - baseForecast.summary.totalNetIncome,
      confidenceReduction: this.getConfidenceScore(baseForecast.confidence) - this.getConfidenceScore(confidence)
    };
    
    const adjustedForecast: AdjustedForecast = {
      ...baseForecast,
      drivers: adjustedDrivers,
      monthlyProjections,
      summary,
      confidence,
      adjustments,
      baseScenario: baseForecast,
      adjustmentImpact,
      metadata: {
        ...baseForecast.metadata,
        generatedAt: new Date()
      }
    };
    
    console.log(`✅ Adjusted forecast: ${adjustmentImpact.netIncomeChange > 0 ? '+' : ''}${adjustmentImpact.netIncomeChange.toLocaleString()} net income change`);
    return adjustedForecast;
  }

  /**
   * Generate scenario comparison with multiple forecasts
   */
  generateScenarioComparison(
    baseForecast: BaseForecast,
    scenarios: Scenario[]
  ): ScenarioComparison {
    console.log(`📊 Generating scenario comparison for ${scenarios.length} scenarios`);
    
    const projections: { [scenarioId: string]: MonthlyProjection[] } = {};
    
    // Generate forecast for each scenario
    for (const scenario of scenarios) {
      if (scenario.adjustments.length === 0) {
        projections[scenario.id] = baseForecast.monthlyProjections;
      } else {
        const adjustedForecast = this.applyAdjustments(baseForecast, scenario.adjustments);
        projections[scenario.id] = adjustedForecast.monthlyProjections;
      }
    }
    
    // Calculate summary metrics across scenarios
    const summary = this.calculateScenarioSummary(scenarios, projections);
    
    return {
      scenarios,
      projections,
      summary,
      metadata: {
        comparedAt: new Date(),
        monthsCompared: baseForecast.monthlyProjections.length
      }
    };
  }

  /**
   * Project a single driver forward using its historical trend
   */
  private projectDriverForward(
    driver: DiscoveredDriver, 
    monthsToProject: number
  ): ProjectedDriver {
    const monthlyGrowthRate = driver.growthRate / 12; // Convert annual to monthly
    
    // Calculate a robust baseline value using improved methodology
    let baseValue = this.calculateRobustBaseline(driver.monthlyValues, driver.name);
    
    const monthlyValues: number[] = [];
    
    // Project forward using compound growth
    for (let month = 0; month < monthsToProject; month++) {
      const growthFactor = Math.pow(1 + monthlyGrowthRate, month + 1);
      let projectedValue = baseValue * growthFactor;
      
      // Apply seasonal adjustments if available
      if (driver.seasonalPattern?.iseasonal) {
        const seasonalIndex = driver.seasonalPattern.seasonalIndices[month % 12] || 1;
        projectedValue *= seasonalIndex;
      }
      
      monthlyValues.push(projectedValue);
    }
    
    // Map confidence level from discovered driver
    const confidence = this.mapDriverConfidence(driver);
    
    return {
      name: driver.name,
      category: driver.category as 'revenue' | 'expense', // Safe cast after filtering
      historicalTrend: monthlyGrowthRate,
      monthlyValues,
      confidence,
      dataSource: 'quickbooks_history',
      baseValue,
      adjustments: []
    };
  }

  /**
   * Apply user adjustments to a projected driver
   */
  private applyDriverAdjustments(
    driver: ProjectedDriver, 
    adjustments: DriverAdjustment[]
  ): ProjectedDriver {
    const adjustedValues = [...driver.monthlyValues];
    
    // Apply each adjustment to the appropriate months
    for (const adjustment of adjustments) {
      const startMonthIndex = this.getMonthIndex(adjustment.startDate);
      const endMonthIndex = adjustment.endDate 
        ? this.getMonthIndex(adjustment.endDate)
        : adjustedValues.length - 1;
      
      // Apply percentage impact to affected months
      for (let i = startMonthIndex; i <= endMonthIndex && i < adjustedValues.length; i++) {
        adjustedValues[i] *= (1 + adjustment.impact);
      }
    }
    
    // Reduce confidence when adjustments are applied
    const adjustedConfidence = this.reduceConfidenceForAdjustments(
      driver.confidence, 
      adjustments
    );
    
    return {
      ...driver,
      monthlyValues: adjustedValues,
      confidence: adjustedConfidence,
      dataSource: 'user_adjustment',
      adjustments
    };
  }

  /**
   * Generate monthly projections by aggregating all drivers
   */
  private generateMonthlyProjections(
    drivers: ProjectedDriver[], 
    monthsToProject: number
  ): MonthlyProjection[] {
    const projections: MonthlyProjection[] = [];
    // Start forecasts from June 2025 (post-sandbox data for demo)
    const forecastStartDate = new Date('2025-06-01');
    
    for (let month = 0; month < monthsToProject; month++) {
      const projectionDate = new Date(forecastStartDate);
      projectionDate.setMonth(projectionDate.getMonth() + month);
      
      // Aggregate revenue drivers
      const totalRevenue = drivers
        .filter(d => d.category === 'revenue')
        .reduce((sum, driver) => sum + (driver.monthlyValues[month] || 0), 0);
      
      // Aggregate expense drivers  
      const totalExpenses = drivers
        .filter(d => d.category === 'expense')
        .reduce((sum, driver) => sum + (driver.monthlyValues[month] || 0), 0);
      
      const netIncome = totalRevenue - totalExpenses;
      
      // Create driver breakdown for transparency
      const driverBreakdown: { [driverName: string]: number } = {};
      drivers.forEach(driver => {
        driverBreakdown[driver.name] = driver.monthlyValues[month] || 0;
      });
      
      // Calculate confidence bands based on driver confidence
      const confidenceBand = this.calculateConfidenceBand(
        netIncome, 
        drivers, 
        month
      );
      
      projections.push({
        month: projectionDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        date: projectionDate,
        totalRevenue,
        totalExpenses,
        netIncome,
        cashFlow: netIncome, // Simplified cash flow = net income
        driverBreakdown,
        confidenceBand
      });
    }
    
    return projections;
  }

  /**
   * Calculate forecast summary metrics
   */
  private calculateForecastSummary(
    projections: MonthlyProjection[], 
    drivers: ProjectedDriver[]
  ): ForecastSummary {
    const totalProjectedRevenue = projections.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalProjectedExpenses = projections.reduce((sum, p) => sum + p.totalExpenses, 0);
    const totalNetIncome = totalProjectedRevenue - totalProjectedExpenses;
    
    const averageMonthlyRevenue = totalProjectedRevenue / projections.length;
    const averageMonthlyExpenses = totalProjectedExpenses / projections.length;
    
    // Calculate runway based on cumulative cash flow
    let cumulativeCash = 0;
    let projectedRunwayMonths = projections.length;
    let breakEvenMonth: number | undefined;
    
    for (let i = 0; i < projections.length; i++) {
      cumulativeCash += projections[i].cashFlow;
      
      // Break-even is when monthly net income becomes positive (profitable)
      if (projections[i].netIncome >= 0 && breakEvenMonth === undefined) {
        breakEvenMonth = i + 1;
      }
      
      if (cumulativeCash < 0) {
        projectedRunwayMonths = i + 1;
      }
    }
    
    // Generate key insights based on data
    const keyInsights = this.generateKeyInsights(projections, drivers);
    
    return {
      totalProjectedRevenue,
      totalProjectedExpenses,
      totalNetIncome,
      averageMonthlyRevenue,
      averageMonthlyExpenses,
      projectedRunwayMonths,
      breakEvenMonth,
      keyInsights
    };
  }

  /**
   * Calculate confidence metrics based on drivers and adjustments
   */
  private calculateConfidenceMetrics(
    drivers: DiscoveredDriver[], 
    adjustments: DriverAdjustment[]
  ): ConfidenceMetrics {
    // Calculate data quality based on driver scores
    const dataQuality = drivers.reduce((sum, d) => sum + d.dataQuality, 0) / drivers.length;
    
    // Calculate trend stability based on predictability
    const trendStability = drivers.reduce((sum, d) => sum + d.predictability, 0) / drivers.length;
    
    // Reduce confidence based on adjustment complexity
    const adjustmentImpact = Math.max(0, 1 - (adjustments.length * 0.1));
    
    const revenueDrivers = drivers.filter(d => d.category === 'revenue');
    const expenseDrivers = drivers.filter(d => d.category === 'expense');
    
    const revenueConfidence = revenueDrivers.length > 0 
      ? revenueDrivers.reduce((sum, d) => sum + d.predictability, 0) / revenueDrivers.length
      : 0.5;
      
    const expenseConfidence = expenseDrivers.length > 0
      ? expenseDrivers.reduce((sum, d) => sum + d.predictability, 0) / expenseDrivers.length
      : 0.5;
    
    const overallScore = (dataQuality + trendStability + adjustmentImpact) / 3;
    const overall = overallScore > 0.7 ? 'high' : overallScore > 0.4 ? 'medium' : 'low';
    
    return {
      overall,
      revenue: revenueConfidence,
      expenses: expenseConfidence,
      factors: {
        dataQuality,
        trendStability,
        adjustmentImpact
      }
    };
  }

  /**
   * Helper methods
   */
  
  private mapDriverConfidence(driver: DiscoveredDriver): 'high' | 'medium' | 'low' {
    const avgScore = (driver.predictability + driver.dataQuality) / 2;
    return avgScore > 0.7 ? 'high' : avgScore > 0.4 ? 'medium' : 'low';
  }
  
  private getMonthIndex(date: Date | string): number {
    // Use June 2025 as forecast start baseline (post-sandbox data)
    const forecastStartDate = new Date('2025-06-01');
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Validate that we have a proper date
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date provided to getMonthIndex:', date);
      return 0; // Default to forecast start month
    }
    
    const monthDiff = (dateObj.getFullYear() - forecastStartDate.getFullYear()) * 12 + 
                     (dateObj.getMonth() - forecastStartDate.getMonth());
    return Math.max(0, monthDiff);
  }
  
  private reduceConfidenceForAdjustments(
    confidence: 'high' | 'medium' | 'low', 
    adjustments: DriverAdjustment[]
  ): 'high' | 'medium' | 'low' {
    if (adjustments.length === 0) return confidence;
    if (adjustments.length >= 3) return 'low';
    if (confidence === 'high') return 'medium';
    return 'low';
  }
  
  private calculateConfidenceBand(
    value: number, 
    drivers: ProjectedDriver[], 
    monthIndex: number
  ): { low: number; high: number } {
    // Calculate uncertainty based on driver confidence
    const uncertaintyFactor = 0.1 + (monthIndex * 0.02); // Increases over time
    const confidenceMultiplier = drivers.filter(d => d.confidence === 'low').length > 0 ? 1.5 : 1.0;
    
    const uncertainty = Math.abs(value) * uncertaintyFactor * confidenceMultiplier;
    
    return {
      low: value - uncertainty,
      high: value + uncertainty
    };
  }
  
  private getConfidenceScore(confidence: ConfidenceMetrics): number {
    return confidence.overall === 'high' ? 0.8 : 
           confidence.overall === 'medium' ? 0.5 : 0.2;
  }
  
  private calculateScenarioSummary(scenarios: Scenario[], projections: { [scenarioId: string]: MonthlyProjection[] }): any {
    // Calculate ranges across all scenarios
    const revenueValues = Object.values(projections).flat().map(p => p.totalRevenue);
    const netIncomeValues = Object.values(projections).flat().map(p => p.netIncome);
    
    return {
      revenueRange: { 
        min: Math.min(...revenueValues), 
        max: Math.max(...revenueValues),
        scenarioId: scenarios[0]?.id || ''
      },
      netIncomeRange: { 
        min: Math.min(...netIncomeValues), 
        max: Math.max(...netIncomeValues),
        scenarioId: scenarios[0]?.id || ''
      },
      runwayRange: { 
        min: 6, 
        max: 18,
        scenarioId: scenarios[0]?.id || ''
      },
      keyDifferences: []
    };
  }
  
  private generateKeyInsights(projections: MonthlyProjection[], drivers: ProjectedDriver[]): string[] {
    const insights: string[] = [];
    
    // Revenue growth insight
    const firstMonthRevenue = projections[0]?.totalRevenue || 0;
    const lastMonthRevenue = projections[projections.length - 1]?.totalRevenue || 0;
    if (lastMonthRevenue > firstMonthRevenue) {
      const growthPercent = ((lastMonthRevenue - firstMonthRevenue) / firstMonthRevenue * 100).toFixed(0);
      insights.push(`Revenue projected to grow ${growthPercent}% over the forecast period`);
    }
    
    // Profitability insight
    const profitableMonths = projections.filter(p => p.netIncome > 0).length;
    if (profitableMonths === projections.length) {
      insights.push('Business projected to remain profitable throughout the period');
    } else if (profitableMonths > projections.length / 2) {
      insights.push(`Business projected to be profitable ${profitableMonths} out of ${projections.length} months`);
    }
    
    // Driver insight
    const topDriver = drivers.reduce((top, driver) => 
      driver.monthlyValues.reduce((sum, val) => sum + Math.abs(val), 0) > 
      top.monthlyValues.reduce((sum, val) => sum + Math.abs(val), 0) ? driver : top
    );
    insights.push(`${topDriver.name} is the largest driver of financial performance`);
    
    return insights;
  }

  /**
   * Calculate a robust baseline value that handles outliers and seasonal patterns
   */
  private calculateRobustBaseline(monthlyValues: number[], driverName: string): number {
    console.log(`📊 Calculating robust baseline for "${driverName}"`);
    
    // Filter out zero values for analysis
    const nonZeroValues = monthlyValues.filter(val => val > 0);
    
    if (nonZeroValues.length === 0) {
      console.log(`⚠️ No non-zero values found for ${driverName}`);
      return 0;
    }

    // Detect catch-all categories that should be treated differently
    const isCatchAllCategory = this.isCatchAllCategory(driverName);
    
    if (isCatchAllCategory) {
      // For catch-all categories, use the minimum non-zero value to be conservative
      // This prevents large one-time expenses from being projected forward
      const minValue = Math.min(...nonZeroValues);
      console.log(`🔧 Using conservative minimum for catch-all category "${driverName}": ${minValue} (vs median which would be higher)`);
      return minValue;
    }

    // For regular categories, use trailing 3-month average with outlier filtering
    const recentValues = nonZeroValues.slice(-3); // Last 3 non-zero values
    
    if (recentValues.length === 0) {
      return 0;
    }

    // Calculate mean and standard deviation for outlier detection
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Filter out outliers (values more than 2 standard deviations from mean)
    const filteredValues = recentValues.filter(val => Math.abs(val - mean) <= 2 * stdDev);
    
    if (filteredValues.length === 0) {
      // If all recent values are outliers, fall back to median of all values
      const sortedValues = [...nonZeroValues].sort((a, b) => a - b);
      const median = sortedValues[Math.floor(sortedValues.length / 2)];
      console.log(`⚠️ All recent values are outliers for ${driverName}, using median: ${median}`);
      return median;
    }

    // Calculate average of filtered recent values
    const robustBaseline = filteredValues.reduce((sum, val) => sum + val, 0) / filteredValues.length;
    
    console.log(`✅ Robust baseline for ${driverName}: ${robustBaseline} (from ${filteredValues.length} recent values)`);
    return robustBaseline;
  }

  /**
   * Detect if a driver name represents a catch-all category
   */
  private isCatchAllCategory(driverName: string): boolean {
    const catchAllTerms = [
      'miscellaneous', 'misc', 'other', 'uncategorized', 'unassigned',
      'general', 'various', 'additional', 'sundry'
    ];
    
    const lowerName = driverName.toLowerCase();
    return catchAllTerms.some(term => lowerName.includes(term));
  }
}