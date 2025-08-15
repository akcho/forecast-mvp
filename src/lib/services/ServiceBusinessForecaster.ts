/**
 * ServiceBusinessForecaster - Specialized revenue forecasting for service businesses
 * Incorporates customer lifecycle, capacity constraints, and seasonality patterns
 */

import { ParsedProfitLoss } from '../types/financialModels';
import { TrendAnalysis } from './TrendAnalyzer';
import { CategorizedExpenses } from './ExpenseCategorizer';

export interface ServiceBusinessMetrics {
  // Revenue characteristics
  averageMonthlyRevenue: number;
  revenueVolatility: number;
  seasonalPeakMultiplier: number;
  
  // Service business indicators
  estimatedCustomerCount: number;
  averageRevenuePerCustomer: number;
  customerAcquisitionRate: number;    // Estimated new customers per month
  customerRetentionRate: number;      // % of customers retained month-to-month
  
  // Capacity and scaling
  estimatedCapacityUtilization: number;  // % of capacity being used
  scalingEfficiency: number;             // How efficiently revenue grows with capacity
  
  // Business maturity
  businessMaturity: 'startup' | 'growth' | 'mature' | 'declining';
  growthPotential: number;               // 0-100 score for growth potential
}

export interface ServiceBusinessAssumptions {
  // Customer dynamics
  targetCustomerGrowthRate: number;      // Monthly % increase in customers
  customerRetentionImprovement: number;  // Monthly improvement in retention %
  averageRevenuePerCustomerGrowth: number; // Monthly ARPC growth %
  
  // Market dynamics
  marketSaturation: number;              // 0-1, how saturated the market is
  competitiveIntensity: 'low' | 'medium' | 'high';
  seasonalFactors: {
    peakSeasons: string[];               // Months with highest activity
    lowSeasons: string[];                // Months with lowest activity
    peakMultiplier: number;              // Revenue multiplier during peaks
    lowMultiplier: number;               // Revenue multiplier during lows
  };
  
  // Capacity constraints
  currentCapacityLimit: number;          // Monthly revenue capacity limit
  capacityExpansionPlan: {
    monthsToExpand: number[];            // Which months to expand capacity
    capacityIncrease: number;            // % increase in capacity
    expansionCost: number;               // One-time cost for expansion
  };
  
  // Service delivery
  serviceDeliveryModel: 'project-based' | 'recurring' | 'hybrid';
  contractDuration: number;              // Average contract length in months
  billingFrequency: 'monthly' | 'quarterly' | 'annually' | 'project';
}

export interface ServiceRevenueProjection {
  month: string;
  date: Date;
  
  // Customer metrics
  estimatedCustomers: number;
  newCustomersAcquired: number;
  customersLost: number;
  averageRevenuePerCustomer: number;
  
  // Revenue components
  recurringRevenue: number;
  projectRevenue: number;
  totalRevenue: number;
  
  // Capacity metrics
  capacityUtilization: number;
  availableCapacity: number;
  capacityConstrainted: boolean;
  
  // Adjustments applied
  seasonalAdjustment: number;
  marketSaturationEffect: number;
  competitiveEffect: number;
}

export class ServiceBusinessForecaster {
  
  /**
   * Analyze historical data to extract service business metrics
   */
  analyzeServiceBusinessMetrics(
    historicalData: ParsedProfitLoss,
    trendAnalysis: TrendAnalysis
  ): ServiceBusinessMetrics {
    
    const monthlyRevenue = historicalData.revenue.monthlyTotals.map(m => m.value);
    const averageMonthlyRevenue = monthlyRevenue.reduce((sum, val) => sum + val, 0) / monthlyRevenue.length;
    const revenueVolatility = this.calculateVolatility(monthlyRevenue);
    
    // Estimate service business characteristics
    const seasonalPeakMultiplier = this.calculateSeasonalPeakMultiplier(monthlyRevenue);
    const estimatedCustomerCount = this.estimateCustomerCount(averageMonthlyRevenue);
    const averageRevenuePerCustomer = averageMonthlyRevenue / estimatedCustomerCount;
    
    // Analyze growth patterns
    const customerAcquisitionRate = this.estimateCustomerAcquisitionRate(monthlyRevenue, estimatedCustomerCount);
    const customerRetentionRate = this.estimateRetentionRate(trendAnalysis.volatilityScore);
    
    // Assess capacity and maturity
    const estimatedCapacityUtilization = this.estimateCapacityUtilization(trendAnalysis.seasonalityScore, revenueVolatility);
    const scalingEfficiency = this.assessScalingEfficiency(trendAnalysis.monthlyGrowthRate, revenueVolatility);
    const businessMaturity = this.assessBusinessMaturity(trendAnalysis, averageMonthlyRevenue);
    const growthPotential = this.assessGrowthPotential(businessMaturity, estimatedCapacityUtilization, trendAnalysis);
    
    return {
      averageMonthlyRevenue,
      revenueVolatility,
      seasonalPeakMultiplier,
      estimatedCustomerCount,
      averageRevenuePerCustomer,
      customerAcquisitionRate,
      customerRetentionRate,
      estimatedCapacityUtilization,
      scalingEfficiency,
      businessMaturity,
      growthPotential
    };
  }
  
  /**
   * Create service business assumptions for forecasting
   */
  createServiceBusinessAssumptions(
    metrics: ServiceBusinessMetrics,
    trendAnalysis: TrendAnalysis,
    scenario: 'baseline' | 'growth' | 'downturn'
  ): ServiceBusinessAssumptions {
    
    // Base assumptions adjusted by scenario
    const scenarioMultipliers = {
      baseline: { growth: 1.0, retention: 1.0, capacity: 1.0 },
      growth: { growth: 1.5, retention: 1.1, capacity: 1.3 },
      downturn: { growth: 0.3, retention: 0.9, capacity: 0.8 }
    };
    
    const multiplier = scenarioMultipliers[scenario];
    
    // Customer growth assumptions
    const baseCustomerGrowth = Math.max(0, metrics.customerAcquisitionRate * 0.8); // Conservative estimate
    const targetCustomerGrowthRate = baseCustomerGrowth * multiplier.growth;
    
    const customerRetentionImprovement = scenario === 'growth' ? 0.5 : 0; // 0.5% monthly improvement in growth scenario
    const averageRevenuePerCustomerGrowth = scenario === 'growth' ? 1.0 : scenario === 'downturn' ? -0.5 : 0.2;
    
    // Market dynamics
    const marketSaturation = this.estimateMarketSaturation(metrics.businessMaturity, metrics.growthPotential);
    const competitiveIntensity = this.assessCompetitiveIntensity(metrics.revenueVolatility);
    
    // Seasonal factors from historical data
    const seasonalFactors = {
      peakSeasons: trendAnalysis.peakMonths,
      lowSeasons: trendAnalysis.lowMonths,
      peakMultiplier: metrics.seasonalPeakMultiplier,
      lowMultiplier: 1 / metrics.seasonalPeakMultiplier
    };
    
    // Capacity planning
    const currentCapacityLimit = metrics.averageMonthlyRevenue / metrics.estimatedCapacityUtilization;
    const capacityExpansionPlan = this.createCapacityExpansionPlan(
      scenario,
      metrics.growthPotential,
      currentCapacityLimit
    );
    
    // Service model detection
    const serviceDeliveryModel = this.detectServiceDeliveryModel(trendAnalysis.volatilityScore);
    const contractDuration = this.estimateContractDuration(serviceDeliveryModel, metrics.customerRetentionRate);
    
    return {
      targetCustomerGrowthRate,
      customerRetentionImprovement,
      averageRevenuePerCustomerGrowth,
      marketSaturation,
      competitiveIntensity,
      seasonalFactors,
      currentCapacityLimit,
      capacityExpansionPlan,
      serviceDeliveryModel,
      contractDuration,
      billingFrequency: 'monthly' // Default assumption
    };
  }
  
  /**
   * Generate service business revenue projections
   */
  generateServiceRevenueProjections(
    metrics: ServiceBusinessMetrics,
    assumptions: ServiceBusinessAssumptions,
    monthsToForecast: number = 12
  ): ServiceRevenueProjection[] {
    
    const projections: ServiceRevenueProjection[] = [];
    
    let currentCustomers = metrics.estimatedCustomerCount;
    let currentARPC = metrics.averageRevenuePerCustomer;
    let currentCapacity = assumptions.currentCapacityLimit;
    
    for (let i = 0; i < monthsToForecast; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      const monthName = forecastDate.toLocaleDateString('en-US', { month: 'short' });
      
      // Customer dynamics
      const newCustomersAcquired = currentCustomers * (assumptions.targetCustomerGrowthRate / 100);
      const retentionRate = metrics.customerRetentionRate + (assumptions.customerRetentionImprovement * i);
      const customersLost = currentCustomers * ((100 - retentionRate) / 100);
      
      currentCustomers = currentCustomers + newCustomersAcquired - customersLost;
      
      // ARPC growth
      currentARPC = currentARPC * (1 + assumptions.averageRevenuePerCustomerGrowth / 100);
      
      // Base revenue calculation
      let baseRevenue = currentCustomers * currentARPC;
      
      // Apply seasonal adjustments
      const seasonalAdjustment = this.getSeasonalAdjustment(monthName, assumptions.seasonalFactors);
      let seasonalRevenue = baseRevenue * seasonalAdjustment;
      
      // Apply market saturation effects
      const saturationEffect = 1 - (assumptions.marketSaturation * 0.1 * i); // Gradual saturation effect
      const marketSaturationEffect = Math.max(0.7, saturationEffect);
      
      // Apply competitive effects
      const competitiveEffect = this.getCompetitiveEffect(assumptions.competitiveIntensity, i);
      
      // Final revenue with all adjustments
      let totalRevenue = seasonalRevenue * marketSaturationEffect * competitiveEffect;
      
      // Check capacity constraints
      const capacityConstrainted = totalRevenue > currentCapacity;
      if (capacityConstrainted) {
        totalRevenue = currentCapacity;
      }
      
      // Capacity expansion
      if (assumptions.capacityExpansionPlan.monthsToExpand.includes(i)) {
        currentCapacity = currentCapacity * (1 + assumptions.capacityExpansionPlan.capacityIncrease / 100);
      }
      
      // Revenue split (simplified model)
      const recurringRevenue = totalRevenue * (assumptions.serviceDeliveryModel === 'recurring' ? 0.9 : 
                                              assumptions.serviceDeliveryModel === 'hybrid' ? 0.6 : 0.2);
      const projectRevenue = totalRevenue - recurringRevenue;
      
      projections.push({
        month: monthName,
        date: forecastDate,
        estimatedCustomers: Math.round(currentCustomers),
        newCustomersAcquired: Math.round(newCustomersAcquired),
        customersLost: Math.round(customersLost),
        averageRevenuePerCustomer: currentARPC,
        recurringRevenue,
        projectRevenue,
        totalRevenue,
        capacityUtilization: totalRevenue / currentCapacity,
        availableCapacity: currentCapacity - totalRevenue,
        capacityConstrainted,
        seasonalAdjustment,
        marketSaturationEffect,
        competitiveEffect
      });
    }
    
    return projections;
  }
  
  // Helper methods
  
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }
  
  private calculateSeasonalPeakMultiplier(monthlyRevenue: number[]): number {
    const maxRevenue = Math.max(...monthlyRevenue);
    const avgRevenue = monthlyRevenue.reduce((sum, val) => sum + val, 0) / monthlyRevenue.length;
    return maxRevenue / avgRevenue;
  }
  
  private estimateCustomerCount(averageMonthlyRevenue: number): number {
    // Heuristic: estimate based on typical landscaping business metrics
    // Assume average customer pays $200-500/month for regular service
    const estimatedARPC = Math.max(200, Math.min(500, averageMonthlyRevenue / 50));
    return Math.round(averageMonthlyRevenue / estimatedARPC);
  }
  
  private estimateCustomerAcquisitionRate(monthlyRevenue: number[], estimatedCustomers: number): number {
    // Estimate new customer acquisition rate based on revenue growth
    if (monthlyRevenue.length < 3) return 5; // Default 5% monthly growth
    
    const recentGrowth = monthlyRevenue.slice(-3);
    const avgGrowth = recentGrowth.reduce((sum, val, idx) => {
      if (idx === 0) return 0;
      return sum + ((val - recentGrowth[idx-1]) / recentGrowth[idx-1]) * 100;
    }, 0) / (recentGrowth.length - 1);
    
    return Math.max(0, Math.min(15, avgGrowth)); // Cap at 15% monthly
  }
  
  private estimateRetentionRate(volatilityScore: number): number {
    // Higher volatility suggests lower retention
    const baseRetention = 90; // 90% base retention
    const volatilityPenalty = volatilityScore * 10; // Up to 10% penalty for high volatility
    return Math.max(70, baseRetention - volatilityPenalty);
  }
  
  private estimateCapacityUtilization(seasonalityScore: number, volatilityScore: number): number {
    // High seasonality and volatility suggest lower average capacity utilization
    const baseUtilization = 75; // 75% base utilization
    const seasonalityPenalty = seasonalityScore * 15; // Up to 15% penalty
    const volatilityPenalty = volatilityScore * 10; // Up to 10% penalty
    return Math.max(50, baseUtilization - seasonalityPenalty - volatilityPenalty) / 100;
  }
  
  private assessScalingEfficiency(monthlyGrowthRate: number, volatilityScore: number): number {
    // Positive growth with low volatility = high scaling efficiency
    if (monthlyGrowthRate > 5 && volatilityScore < 0.3) return 0.9;
    if (monthlyGrowthRate > 0 && volatilityScore < 0.5) return 0.7;
    return 0.5;
  }
  
  private assessBusinessMaturity(trendAnalysis: TrendAnalysis, averageRevenue: number): 'startup' | 'growth' | 'mature' | 'declining' {
    if (trendAnalysis.monthlyGrowthRate > 10) return 'startup';
    if (trendAnalysis.monthlyGrowthRate > 3) return 'growth';
    if (trendAnalysis.monthlyGrowthRate > -2) return 'mature';
    return 'declining';
  }
  
  private assessGrowthPotential(maturity: string, capacityUtilization: number, trendAnalysis: TrendAnalysis): number {
    let baseScore = 50;
    
    // Maturity bonus
    if (maturity === 'startup') baseScore += 30;
    else if (maturity === 'growth') baseScore += 20;
    else if (maturity === 'declining') baseScore -= 30;
    
    // Capacity bonus
    if (capacityUtilization < 0.7) baseScore += 20;
    else if (capacityUtilization > 0.9) baseScore -= 15;
    
    // Trend bonus
    if (trendAnalysis.monthlyGrowthRate > 5) baseScore += 15;
    else if (trendAnalysis.monthlyGrowthRate < 0) baseScore -= 20;
    
    return Math.max(0, Math.min(100, baseScore));
  }
  
  private estimateMarketSaturation(maturity: 'startup' | 'growth' | 'mature' | 'declining', growthPotential: number): number {
    const maturityFactors = { startup: 0.1, growth: 0.3, mature: 0.6, declining: 0.8 };
    const baseSaturation = maturityFactors[maturity] || 0.5;
    const potentialAdjustment = (100 - growthPotential) / 200; // 0-0.5 adjustment
    return Math.min(0.9, baseSaturation + potentialAdjustment);
  }
  
  private assessCompetitiveIntensity(volatilityScore: number): 'low' | 'medium' | 'high' {
    if (volatilityScore > 0.6) return 'high';
    if (volatilityScore > 0.3) return 'medium';
    return 'low';
  }
  
  private createCapacityExpansionPlan(scenario: string, growthPotential: number, currentCapacity: number) {
    if (scenario === 'downturn') {
      return { monthsToExpand: [], capacityIncrease: 0, expansionCost: 0 };
    }
    
    const expansionMultiplier = scenario === 'growth' ? 1.5 : 1.0;
    const monthsToExpand = growthPotential > 70 ? [6, 12] : growthPotential > 50 ? [9] : [];
    
    return {
      monthsToExpand,
      capacityIncrease: 25 * expansionMultiplier, // 25-37.5% capacity increase
      expansionCost: currentCapacity * 0.1 * expansionMultiplier // 10-15% of capacity as cost
    };
  }
  
  private detectServiceDeliveryModel(volatilityScore: number): 'project-based' | 'recurring' | 'hybrid' {
    if (volatilityScore > 0.5) return 'project-based';
    if (volatilityScore < 0.2) return 'recurring';
    return 'hybrid';
  }
  
  private estimateContractDuration(model: string, retentionRate: number): number {
    if (model === 'project-based') return 3; // 3 months average
    if (model === 'recurring') return Math.max(6, retentionRate / 10); // 6-12 months based on retention
    return 6; // 6 months for hybrid
  }
  
  private getSeasonalAdjustment(month: string, seasonalFactors: any): number {
    if (seasonalFactors.peakSeasons.includes(month)) {
      return seasonalFactors.peakMultiplier;
    }
    if (seasonalFactors.lowSeasons.includes(month)) {
      return seasonalFactors.lowMultiplier;
    }
    return 1.0;
  }
  
  private getCompetitiveEffect(intensity: 'low' | 'medium' | 'high', monthIndex: number): number {
    const competitiveDecay = { low: 0.002, medium: 0.005, high: 0.01 };
    const decayRate = competitiveDecay[intensity] || 0.005;
    return Math.max(0.8, 1 - (decayRate * monthIndex)); // Gradual competitive pressure
  }
}