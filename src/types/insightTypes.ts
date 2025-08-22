/**
 * Types for the intelligent insights system
 */

export interface Insight {
  id: string;
  type: 'warning' | 'opportunity' | 'info' | 'success';
  priority: 'high' | 'medium' | 'low';
  category: 'data_quality' | 'trend' | 'anomaly' | 'margin' | 'concentration' | 'seasonality' | 'efficiency';
  title: string;
  message: string;
  detail?: string;
  action?: string;
  impact?: {
    metric: string;
    value: number;
    unit?: string;
  };
  timeframe?: 'current' | 'recent' | 'historical' | 'projected';
  score: number; // For ranking importance
  metadata?: {
    driverName?: string;
    period?: string;
    values?: number[];
    correlatedDrivers?: string[];
  };
}

export interface CategorizedInsights {
  critical: Insight[];  // High priority warnings
  warnings: Insight[];  // All warnings
  opportunities: Insight[]; // Growth/optimization opportunities
  dataQuality: Insight[]; // Data quality issues
  all: Insight[];       // All insights ranked by importance
  summary: {
    totalInsights: number;
    criticalCount: number;
    warningCount: number;
    opportunityCount: number;
    dataQualityScore: number; // 0-100
  };
}

export interface InsightAnalyzer {
  analyze(
    monthlyData: any, // ParsedProfitLoss
    drivers: any[],   // DiscoveredDriver[]
    forecast: any[]   // MonthlyProjection[]
  ): Insight[];
}

export interface SeasonalityResult {
  isSeasonl: boolean;
  strength: number;
  pattern: 'spring_peak' | 'summer_peak' | 'fall_peak' | 'winter_peak' | 'none';
  peakMonths: number[];
  lowMonths: number[];
}

export interface CorrelationResult {
  correlation: number;
  laggedCorrelation: number;
  strength: 'strong' | 'moderate' | 'weak';
  direction: 'positive' | 'negative';
}

export interface AnomalyResult {
  isAnomaly: boolean;
  severity: 'extreme' | 'moderate' | 'mild';
  direction: 'spike' | 'drop';
  standardDeviations: number;
  expectedRange: {
    min: number;
    max: number;
  };
}

export interface DataQualityMetrics {
  completeness: number; // 0-100%
  consistency: number;  // 0-100%
  uncategorizedPercent: number; // 0-100%
  dataGaps: string[]; // Missing periods
  overallScore: number; // 0-100
}