/**
 * Type definitions for driver-based forecasting system
 * Implements the flexible canvas approach from FORECAST_DESIGN.md
 */

import { DiscoveredDriver } from './driverTypes';

// ============================================================================
// Core Forecast Types
// ============================================================================

export interface ProjectedDriver {
  name: string;
  category: 'revenue' | 'expense';
  historicalTrend: number;        // Monthly growth rate
  monthlyValues: number[];        // 12-month projection
  confidence: 'high' | 'medium' | 'low';
  dataSource: 'quickbooks_history' | 'user_adjustment';
  baseValue: number;             // Starting value for projections
  adjustments: DriverAdjustment[]; // User-applied modifications
}

export interface MonthlyProjection {
  month: string;
  date: Date;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashFlow: number;
  runwayMonths?: number;
  driverBreakdown: {
    [driverName: string]: number;
  };
  confidenceBand: {
    low: number;
    high: number;
  };
}

export interface BaseForecast {
  drivers: ProjectedDriver[];
  monthlyProjections: MonthlyProjection[];
  summary: ForecastSummary;
  confidence: ConfidenceMetrics;
  metadata: {
    generatedAt: Date;
    baseDataPeriod: { start: Date; end: Date; };
    projectionPeriod: { start: Date; end: Date; };
  };
}

export interface ForecastSummary {
  totalProjectedRevenue: number;
  totalProjectedExpenses: number;
  totalNetIncome: number;
  averageMonthlyRevenue: number;
  averageMonthlyExpenses: number;
  projectedRunwayMonths: number;
  breakEvenMonth?: number;        // Month when cumulative becomes positive
  keyInsights: string[];          // Generated business insights
}

export interface ConfidenceMetrics {
  overall: 'high' | 'medium' | 'low';
  revenue: number;               // 0-1 confidence score
  expenses: number;              // 0-1 confidence score
  factors: {
    dataQuality: number;         // Based on driver data quality
    trendStability: number;      // Based on driver predictability
    adjustmentImpact: number;    // Reduced confidence from heavy adjustments
  };
}

// ============================================================================
// Driver Adjustment System
// ============================================================================

export interface DriverAdjustment {
  id: string;
  driverId: string;              // Which discovered driver this affects
  label: string;                 // User-friendly name like "Import Tariffs"
  impact: number;                // Percentage change (0.25 = +25%)
  startDate: Date;
  endDate?: Date;                // Optional for temporary adjustments
  note?: string;                 // User explanation
  createdBy: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface AdjustmentCalculation {
  baseValue: number;
  historicalGrowth: number;
  adjustments: AppliedAdjustment[];
  finalValue: number;
  calculationPath: string;       // For transparency
}

export interface AppliedAdjustment {
  label: string;
  impact: number;
  appliedValue: number;
  monthsActive: number[];        // Which months this adjustment applies to
}

export interface AdjustedForecast extends BaseForecast {
  adjustments: DriverAdjustment[];
  baseScenario: BaseForecast;    // Reference to unadjusted version
  adjustmentImpact: {
    totalRevenueChange: number;
    totalExpenseChange: number;
    netIncomeChange: number;
    confidenceReduction: number;
  };
}

// ============================================================================
// Scenario Management
// ============================================================================

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  adjustments: DriverAdjustment[];
  createdAt: Date;
  modifiedAt: Date;
  isDefault: boolean;
  color?: string;               // For chart visualization
}

export interface ScenarioComparison {
  scenarios: Scenario[];
  projections: {
    [scenarioId: string]: MonthlyProjection[];
  };
  summary: ScenarioSummary;
  metadata: {
    comparedAt: Date;
    monthsCompared: number;
  };
}

export interface ScenarioSummary {
  revenueRange: { min: number; max: number; scenarioId: string; };
  netIncomeRange: { min: number; max: number; scenarioId: string; };
  runwayRange: { min: number; max: number; scenarioId: string; };
  keyDifferences: ScenarioDifference[];
}

export interface ScenarioDifference {
  metric: 'revenue' | 'expenses' | 'netIncome' | 'runway';
  description: string;
  impact: number;               // Percentage difference
  scenarioIds: [string, string]; // Which scenarios are being compared
}

// ============================================================================
// Driver Forecast Service Interfaces
// ============================================================================

export interface ForecastRequest {
  monthsToProject?: number;      // Default 12
  includeConfidenceBands?: boolean; // Default true
  scenarios?: Scenario[];        // Optional scenario definitions
  adjustments?: DriverAdjustment[]; // Quick adjustments without full scenario
}

export interface ForecastResponse {
  success: boolean;
  forecast?: BaseForecast | AdjustedForecast;
  scenarios?: ScenarioComparison;
  error?: string;
  warnings?: string[];          // Data quality or confidence warnings
}

// ============================================================================
// UI Component Types
// ============================================================================

export interface DriverSliderConfig {
  driverId: string;
  name: string;
  currentValue: number;
  adjustmentRange: { min: number; max: number; }; // Percentage range
  step: number;                 // Slider increment (e.g., 0.05 for 5%)
  formatValue: (value: number) => string; // For display
  confidence: 'high' | 'medium' | 'low';
}

export interface ForecastChartData {
  months: string[];
  datasets: {
    label: string;
    values: number[];
    color: string;
    type: 'line' | 'area' | 'confidence';
    scenarioId?: string;
  }[];
}

export interface KeyMetricCard {
  label: string;
  value: number;
  format: 'currency' | 'percentage' | 'months' | 'number';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: number;
    period: string;
  };
  confidence?: 'high' | 'medium' | 'low';
}

// ============================================================================
// Calculation Transparency
// ============================================================================

export interface CalculationBreakdown {
  driverName: string;
  month: string;
  steps: CalculationStep[];
  finalValue: number;
  confidence: number;
}

export interface CalculationStep {
  description: string;
  operation: string;           // e.g., "base × growth", "previous + adjustment"
  inputs: { [key: string]: number; };
  output: number;
}

// ============================================================================
// Error and Validation Types
// ============================================================================

export interface ForecastValidationError {
  type: 'missing_data' | 'invalid_adjustment' | 'calculation_error';
  message: string;
  driverId?: string;
  adjustmentId?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DataQualityReport {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  issues: {
    type: 'missing_months' | 'inconsistent_data' | 'low_confidence';
    description: string;
    affectedDrivers: string[];
    impact: 'high' | 'medium' | 'low';
  }[];
  recommendations: string[];
}