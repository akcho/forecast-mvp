/**
 * DriverDiscoveryService - Systematic analysis of QuickBooks data to discover key business drivers
 * Implements the data-driven approach documented in DRIVER_DISCOVERY_DESIGN.md
 */

import { FinancialDataParser } from './FinancialDataParser';
import { 
  DiscoveredDriver, 
  DriverDiscoveryResult, 
  LineItemAnalysis, 
  ForecastMethod
} from '../../types/driverTypes';
import { ParsedProfitLoss } from '../../types/financialModels';

export class DriverDiscoveryService {
  private parser: FinancialDataParser;
  
  // Default scoring weights from design doc
  private scoreWeights = {
    materiality: 0.3,
    variability: 0.2,
    predictability: 0.2,
    growthImpact: 0.2,
    dataQuality: 0.1
  };
  
  // Default selection criteria (adjusted for sandbox data)
  private criteria = {
    minimumScore: 0.2,            // Lowered from 0.4 for demo data
    minimumMateriality: 0.005,    // 0.5% of business (lowered from 1%)
    minimumDataQuality: 0.05,     // 5% data coverage (very lenient for sparse demo data)
    correlationThreshold: 0.8     // 80% correlation for grouping
  };
  
  constructor() {
    this.parser = new FinancialDataParser();
  }
  
  /**
   * Type guard to check if data is already parsed ParsedProfitLoss
   */
  private isParsedProfitLoss(data: any): data is ParsedProfitLoss {
    return data && 
           typeof data === 'object' &&
           data.period &&
           data.revenue &&
           data.expenses &&
           data.netIncome &&
           Array.isArray(data.revenue.lines) &&
           Array.isArray(data.expenses.lines);
  }
  
  /**
   * Main entry point: Discover drivers from QuickBooks P&L data (raw QB format)
   */
  async discoverDrivers(profitLossReport: any): Promise<DriverDiscoveryResult>;
  
  /**
   * Overloaded entry point: Discover drivers from already-parsed P&L data
   */
  async discoverDrivers(parsedData: ParsedProfitLoss): Promise<DriverDiscoveryResult>;
  
  /**
   * Implementation: Handle both raw and parsed data
   */
  async discoverDrivers(data: any | ParsedProfitLoss): Promise<DriverDiscoveryResult> {
    const startTime = Date.now();
    console.log('🔍 Starting driver discovery analysis...');
    
    try {
      // Step 1: Determine if we have raw QB data or parsed data
      let parsedData: ParsedProfitLoss;
      
      if (this.isParsedProfitLoss(data)) {
        // Data is already parsed
        console.log('📊 Using already-parsed P&L data');
        parsedData = data;
      } else {
        // Data is raw QuickBooks format, parse it
        console.log('🔄 Parsing raw QuickBooks P&L data');
        parsedData = this.parser.parseMonthlyProfitLoss(data);
      }
      
      // Step 2: Analyze each line item
      const lineItemAnalyses = this.analyzeAllLineItems(parsedData);
      
      // Step 3: Calculate composite scores and select drivers
      const potentialDrivers = this.scoreAndSelectDrivers(lineItemAnalyses);
      
      // Step 4: Assign forecast methods
      const driversWithMethods = this.assignForecastMethods(potentialDrivers);
      
      // Step 5: Generate comprehensive analysis
      const result = this.generateAnalysisResult(
        driversWithMethods, 
        lineItemAnalyses, 
        parsedData,
        startTime
      );
      
      console.log(`✅ Driver discovery complete: Found ${result.drivers.length} drivers in ${result.metadata.processingTimeMs}ms`);
      return result;
      
    } catch (error) {
      console.error('❌ Driver discovery failed:', error);
      throw new Error(`Driver discovery failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Step 2: Analyze every line item for driver potential
   */
  private analyzeAllLineItems(parsedData: any): LineItemAnalysis[] {
    console.log('📊 Analyzing line items for driver potential...');
    
    const analyses: LineItemAnalysis[] = [];
    
    // Analyze revenue lines
    for (const line of parsedData.revenue.lines) {
      if (line.type !== 'summary' && line.accountName.trim()) {
        const analysis = this.analyzeLineItem(line, 'revenue', parsedData);
        if (analysis) analyses.push(analysis);
      }
    }
    
    // Analyze expense lines  
    for (const line of parsedData.expenses.lines) {
      if (line.type !== 'summary' && line.accountName.trim()) {
        const analysis = this.analyzeLineItem(line, 'expense', parsedData);
        if (analysis) analyses.push(analysis);
      }
    }
    
    console.log(`📈 Analyzed ${analyses.length} line items`);
    return analyses;
  }
  
  /**
   * Core analysis method: Calculate all scores for a single line item
   */
  private analyzeLineItem(
    line: any, 
    category: 'revenue' | 'expense', 
    parsedData: any
  ): LineItemAnalysis | null {
    
    if (!line.monthlyValues || line.monthlyValues.length === 0) return null;
    
    const monthlyValues = line.monthlyValues.map((mv: any) => mv.value);
    const businessTotal = category === 'revenue' 
      ? parsedData.revenue.grandTotal 
      : parsedData.expenses.grandTotal;
    
    // Skip if no meaningful data
    if (Math.abs(line.total) < 1 || businessTotal === 0) return null;
    
    return {
      name: line.accountName,
      accountId: line.accountId,
      category,
      monthlyValues,
      dateRange: {
        start: new Date(parsedData.period.start),
        end: new Date(parsedData.period.end)
      },
      
      // Calculate core scores
      materiality: this.calculateMaterialityScore(line.total, businessTotal),
      variability: this.calculateVariabilityScore(monthlyValues),
      predictability: this.calculatePredictabilityScore(monthlyValues),
      growthImpact: this.calculateGrowthImpactScore(monthlyValues),
      dataQuality: this.calculateDataQualityScore(monthlyValues),
      
      // Additional metrics
      correlationWithRevenue: this.calculateCorrelationWithRevenue(monthlyValues, parsedData),
      totalValue: line.total,
      averageMonthlyValue: monthlyValues.reduce((sum: number, val: number) => sum + val, 0) / monthlyValues.length
    };
  }
  
  /**
   * Score 1: Materiality (how much of the business this represents)
   */
  private calculateMaterialityScore(lineTotal: number, businessTotal: number): number {
    return Math.abs(lineTotal) / Math.abs(businessTotal);
  }
  
  /**
   * Score 2: Variability (coefficient of variation)
   */
  private calculateVariabilityScore(monthlyValues: number[]): number {
    const mean = monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length;
    if (mean === 0) return 0;
    
    const variance = monthlyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlyValues.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / Math.abs(mean);
    
    // Normalize to 0-1 scale (cap at 5.0 for extremely volatile items to handle sparse sandbox data)
    return Math.min(coefficientOfVariation, 5.0) / 5.0;
  }
  
  /**
   * Score 3: Predictability (R² of trend line)
   */
  private calculatePredictabilityScore(monthlyValues: number[]): number {
    if (monthlyValues.length < 3) return 0;
    
    const xValues = monthlyValues.map((_, i) => i);
    const { rSquared } = this.linearRegression(xValues, monthlyValues);
    
    return Math.max(0, rSquared);
  }
  
  /**
   * Score 4: Growth Impact (CAGR significance)
   */
  private calculateGrowthImpactScore(monthlyValues: number[]): number {
    if (monthlyValues.length < 6) return 0;
    
    const firstNonZero = monthlyValues.find(val => val !== 0) || 0;
    const lastValue = monthlyValues[monthlyValues.length - 1];
    
    if (firstNonZero === 0) return 0;
    
    const periodsPerYear = 12;
    const years = monthlyValues.length / periodsPerYear;
    const cagr = Math.pow(Math.abs(lastValue) / Math.abs(firstNonZero), 1 / years) - 1;
    
    // Normalize growth rate impact (cap at 20% for scoring)
    return Math.min(Math.abs(cagr) * 5, 1.0);
  }
  
  /**
   * Score 5: Data Quality (completeness)
   */
  private calculateDataQualityScore(monthlyValues: number[]): number {
    const nonZeroMonths = monthlyValues.filter(val => val !== 0).length;
    return nonZeroMonths / monthlyValues.length;
  }
  
  /**
   * Calculate correlation with total revenue
   */
  private calculateCorrelationWithRevenue(monthlyValues: number[], parsedData: any): number {
    const revenueValues = parsedData.revenue.monthlyTotals.map((mv: any) => mv.value);
    return this.calculateCorrelation(monthlyValues, revenueValues);
  }
  
  /**
   * Step 3: Score drivers and apply selection criteria
   */
  private scoreAndSelectDrivers(analyses: LineItemAnalysis[]): DiscoveredDriver[] {
    console.log('🎯 Scoring and selecting drivers...');
    
    const scoredDrivers: DiscoveredDriver[] = [];
    let debugCount = 0;
    
    for (const analysis of analyses) {
      // Calculate composite score
      const impactScore = this.calculateDriverScore(analysis);
      
      // Debug logging for first few items
      if (debugCount < 5) {
        console.log(`🔍 DEBUG: ${analysis.name}:`, {
          materiality: analysis.materiality.toFixed(3),
          variability: analysis.variability.toFixed(3),
          predictability: analysis.predictability.toFixed(3),
          growthImpact: analysis.growthImpact.toFixed(3),
          dataQuality: analysis.dataQuality.toFixed(3),
          compositeScore: impactScore.toFixed(3),
          passesScore: impactScore > this.criteria.minimumScore,
          passesMateriality: analysis.materiality > this.criteria.minimumMateriality,
          passesDataQuality: analysis.dataQuality > this.criteria.minimumDataQuality
        });
        debugCount++;
      }
      
      // Apply selection criteria
      if (this.shouldIncludeDriver(analysis, impactScore)) {
        const driver: DiscoveredDriver = {
          name: analysis.name,
          category: analysis.category,
          quickbooksLineId: analysis.accountId,
          
          // Convert to 0-100 scale for display
          impactScore: Math.round(impactScore * 100),
          materiality: Math.round(analysis.materiality * 100),
          variability: Math.round(analysis.variability * 100),
          predictability: Math.round(analysis.predictability * 100),
          growthImpact: Math.round(analysis.growthImpact * 100),
          dataQuality: Math.round(analysis.dataQuality * 100),
          
          monthlyValues: analysis.monthlyValues,
          dateRange: analysis.dateRange,
          correlationWithRevenue: analysis.correlationWithRevenue,
          correlatedDrivers: [],
          
          // Will be assigned in next steps
          suggestedMethod: { method: 'simple_growth', parameters: {}, confidence: 0.5 },
          confidence: this.calculateConfidence(analysis),
          coverage: analysis.materiality * 100,
          businessType: this.classifyBusinessType(analysis),
          trend: this.determineTrend(analysis.monthlyValues),
          growthRate: this.calculateAnnualGrowthRate(analysis.monthlyValues)
        };
        
        scoredDrivers.push(driver);
      }
    }
    
    // Sort by impact score
    scoredDrivers.sort((a, b) => b.impactScore - a.impactScore);
    
    console.log(`✅ Selected ${scoredDrivers.length} potential drivers`);
    return scoredDrivers;
  }
  
  /**
   * Calculate composite driver score using weighted formula
   */
  private calculateDriverScore(analysis: LineItemAnalysis): number {
    return (
      analysis.materiality * this.scoreWeights.materiality +
      analysis.variability * this.scoreWeights.variability +
      analysis.predictability * this.scoreWeights.predictability +
      analysis.growthImpact * this.scoreWeights.growthImpact +
      analysis.dataQuality * this.scoreWeights.dataQuality
    );
  }
  
  /**
   * Apply selection criteria to determine if line item should be included
   */
  private shouldIncludeDriver(analysis: LineItemAnalysis, score: number): boolean {
    return (
      score > this.criteria.minimumScore &&
      analysis.materiality > this.criteria.minimumMateriality &&
      analysis.dataQuality > this.criteria.minimumDataQuality
    );
  }
  
  /**
   * Step 4: Assign appropriate forecast methods to each driver
   */
  private assignForecastMethods(drivers: DiscoveredDriver[]): DiscoveredDriver[] {
    console.log('🎯 Assigning forecast methods...');
    
    for (const driver of drivers) {
      driver.suggestedMethod = this.determineOptimalForecastMethod(driver);
    }
    
    return drivers;
  }
  
  /**
   * Determine optimal forecast method based on driver characteristics
   */
  private determineOptimalForecastMethod(driver: DiscoveredDriver): ForecastMethod {
    // High revenue correlation -> percentage of revenue
    if (driver.correlationWithRevenue > 0.7) {
      return {
        method: 'percentage_of_revenue',
        parameters: {
          historicalRatio: driver.coverage / 100,
          confidence: driver.correlationWithRevenue
        },
        confidence: driver.correlationWithRevenue
      };
    }
    
    // High predictability and low variability -> trend extrapolation
    if (driver.predictability > 80 && driver.variability < 20) {
      return {
        method: 'trend_extrapolation',
        parameters: {
          monthlyGrowthRate: this.calculateTrendSlope(driver.monthlyValues),
          confidence: driver.predictability / 100
        },
        confidence: driver.predictability / 100
      };
    }
    
    // High variability -> scenario range
    if (driver.variability > 50) {
      return {
        method: 'scenario_range',
        parameters: {
          conservativeValue: this.calculatePercentile(driver.monthlyValues, 25),
          baseValue: this.calculateMean(driver.monthlyValues),
          aggressiveValue: this.calculatePercentile(driver.monthlyValues, 75)
        },
        confidence: 0.6
      };
    }
    
    // Default: simple growth
    return {
      method: 'simple_growth',
      parameters: {
        annualGrowthRate: this.calculateAnnualGrowthRate(driver.monthlyValues)
      },
      confidence: 0.5
    };
  }
  
  /**
   * Helper methods for calculations
   */
  
  private linearRegression(x: number[], y: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R²
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const rSquared = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, rSquared: Math.max(0, rSquared) };
  }
  
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < x.length; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      denomX += diffX * diffX;
      denomY += diffY * diffY;
    }
    
    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  private calculateConfidence(analysis: LineItemAnalysis): 'high' | 'medium' | 'low' {
    const factors = [
      analysis.predictability,
      analysis.dataQuality,
      Math.min(analysis.materiality * 2, 1),
      1 - analysis.variability
    ];
    
    const averageConfidence = factors.reduce((sum, f) => sum + f, 0) / factors.length;
    
    if (averageConfidence > 0.7) return 'high';
    if (averageConfidence > 0.4) return 'medium';
    return 'low';
  }
  
  private classifyBusinessType(analysis: LineItemAnalysis): string {
    if (analysis.category === 'revenue') {
      return analysis.variability < 0.2 ? 'recurring_revenue' : 'variable_revenue';
    } else {
      return analysis.correlationWithRevenue > 0.7 ? 'variable_cost' : 'fixed_cost';
    }
  }
  
  private determineTrend(monthlyValues: number[]): 'growing' | 'declining' | 'stable' {
    const growthRate = this.calculateAnnualGrowthRate(monthlyValues);
    if (growthRate > 0.05) return 'growing';
    if (growthRate < -0.05) return 'declining';
    return 'stable';
  }
  
  private calculateAnnualGrowthRate(monthlyValues: number[]): number {
    if (monthlyValues.length < 12) return 0;
    
    const firstValue = monthlyValues.find(val => val !== 0) || 0;
    const lastValue = monthlyValues[monthlyValues.length - 1];
    
    if (firstValue === 0) return 0;
    
    const years = monthlyValues.length / 12;
    return Math.pow(Math.abs(lastValue) / Math.abs(firstValue), 1 / years) - 1;
  }
  
  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
  
  private calculateTrendSlope(monthlyValues: number[]): number {
    const xValues = monthlyValues.map((_, i) => i);
    const { slope } = this.linearRegression(xValues, monthlyValues);
    return slope;
  }
  
  /**
   * Step 5: Generate comprehensive analysis result
   */
  private generateAnalysisResult(
    drivers: DiscoveredDriver[],
    allAnalyses: LineItemAnalysis[],
    parsedData: any,
    startTime: number
  ): DriverDiscoveryResult {
    
    const processingTime = Date.now() - startTime;
    
    return {
      drivers,
      summary: {
        driversFound: drivers.length,
        businessCoverage: Math.round(this.calculateBusinessCoverage(drivers)),
        averageConfidence: this.calculateAverageConfidence(drivers),
        monthsAnalyzed: parsedData.revenue.monthlyTotals.length,
        dataQuality: this.assessDataQuality(drivers),
        recommendedApproach: 'driver_based_forecasting'
      },
      recommendations: {
        primaryDrivers: drivers.slice(0, Math.min(5, drivers.length)),
        secondaryDrivers: drivers.slice(5),
        consolidatedItems: [],
        excludedItems: this.identifyExcludedItems(allAnalyses, drivers)
      },
      metadata: {
        analysisDate: new Date(),
        quickbooksDataRange: {
          start: new Date(parsedData.period.start),
          end: new Date(parsedData.period.end)
        },
        algorithmsUsed: ['composite_scoring', 'correlation_analysis', 'trend_detection'],
        processingTimeMs: processingTime
      }
    };
  }
  
  private calculateBusinessCoverage(drivers: DiscoveredDriver[]): number {
    // Calculate coverage separately for revenue and expense drivers
    const revenueDrivers = drivers.filter(d => d.category === 'revenue');
    const expenseDrivers = drivers.filter(d => d.category === 'expense');
    
    const revenueCoverage = revenueDrivers.reduce((sum, d) => sum + d.coverage, 0);
    const expenseCoverage = expenseDrivers.reduce((sum, d) => sum + d.coverage, 0);
    
    // Take the average of revenue and expense coverage to avoid double-counting
    // This represents how much of the overall business financial activity we're explaining
    const overallCoverage = (revenueCoverage + expenseCoverage) / 2;
    
    // Cap at 100% since you can't explain more than 100% of a business
    return Math.min(overallCoverage, 100);
  }
  
  private calculateAverageConfidence(drivers: DiscoveredDriver[]): number {
    const confidenceScores = drivers.map(d => {
      switch (d.confidence) {
        case 'high': return 0.8;
        case 'medium': return 0.6;
        case 'low': return 0.4;
        default: return 0.5;
      }
    });
    
    return Math.round((confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length) * 100);
  }
  
  private assessDataQuality(drivers: DiscoveredDriver[]): 'excellent' | 'good' | 'fair' | 'poor' {
    const averageQuality = drivers.reduce((sum, d) => sum + d.dataQuality, 0) / drivers.length;
    
    if (averageQuality > 85) return 'excellent';
    if (averageQuality > 70) return 'good';
    if (averageQuality > 50) return 'fair';
    return 'poor';
  }
  
  private identifyExcludedItems(allAnalyses: LineItemAnalysis[], selectedDrivers: DiscoveredDriver[]): string[] {
    const selectedNames = new Set(selectedDrivers.map(d => d.name));
    return allAnalyses
      .filter(analysis => !selectedNames.has(analysis.name))
      .map(analysis => analysis.name);
  }
}