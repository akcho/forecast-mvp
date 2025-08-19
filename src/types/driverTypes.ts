/**
 * Type definitions for driver-based forecasting system
 */

export interface MonthlyDataPoint {
  month: string;
  value: number;
  date: Date;
}

export interface LineItemAnalysis {
  // Basic info
  name: string;
  accountId?: string;
  category: 'revenue' | 'expense' | 'balance_sheet';
  
  // Historical data
  monthlyValues: number[];
  dateRange: { start: Date; end: Date; };
  
  // Core analysis scores (0-1)
  materiality: number;        // Size relative to business
  variability: number;        // Month-to-month variation (coefficient of variation)
  predictability: number;     // How well it follows trends (R²)
  growthImpact: number;      // Significance of growth/decline
  dataQuality: number;       // Completeness of historical data
  
  // Relationships
  correlationWithRevenue: number;
  totalValue: number;
  averageMonthlyValue: number;
}

export interface ForecastMethod {
  method: 'percentage_of_revenue' | 'trend_extrapolation' | 'seasonal_model' | 'scenario_range' | 'simple_growth';
  parameters: any;
  confidence: number;
}

export interface SeasonalPattern {
  iseasonal: boolean;
  peakMonths: number[];
  lowMonths: number[];
  seasonalIndices: number[];
}

export interface DiscoveredDriver {
  // Identity
  name: string;
  category: 'revenue' | 'expense' | 'balance_sheet';
  quickbooksLineId?: string;
  
  // Analysis scores (0-100 for display, but 0-1 internally)
  impactScore: number;        // Overall composite score
  materiality: number;        // Size relative to business
  variability: number;        // Month-to-month variation
  predictability: number;     // How well it follows trends
  growthImpact: number;      // Significance of growth/decline
  dataQuality: number;       // Completeness of historical data
  
  // Historical data
  monthlyValues: number[];
  dateRange: { start: Date; end: Date; };
  
  // Relationships
  correlationWithRevenue: number;
  correlatedDrivers: string[];  // Names of related drivers
  
  // Forecasting
  suggestedMethod: ForecastMethod;
  confidence: 'high' | 'medium' | 'low';
  
  // Business context
  coverage: number;          // % of total business this represents
  businessType: string;      // e.g., "recurring_revenue", "variable_cost"
  trend: 'growing' | 'declining' | 'stable';
  growthRate: number;        // Annual growth rate
  
  // Seasonal analysis
  seasonalPattern?: SeasonalPattern;
}

export interface DriverDiscoveryResult {
  // Discovered drivers
  drivers: DiscoveredDriver[];
  
  // Analysis summary
  summary: {
    driversFound: number;
    businessCoverage: number;        // % of business explained
    averageConfidence: number;
    monthsAnalyzed: number;
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    recommendedApproach: string;
  };
  
  // Recommendations
  recommendations: {
    primaryDrivers: DiscoveredDriver[];      // Top 3-5 most important
    secondaryDrivers: DiscoveredDriver[];    // Important but secondary
    consolidatedItems: string[];             // Small items to group together
    excludedItems: string[];                 // Items too small/noisy to model
  };
  
  // Metadata
  metadata: {
    analysisDate: Date;
    quickbooksDataRange: { start: Date; end: Date; };
    algorithmsUsed: string[];
    processingTimeMs: number;
  };
}