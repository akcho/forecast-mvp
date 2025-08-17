# Driver Discovery System Design

## Overview

The Driver Discovery System automatically analyzes QuickBooks financial data to identify the key business drivers that matter most for forecasting. Instead of using arbitrary assumptions or generic models, this system lets the data determine what actually drives the business.

## Core Algorithm

### Step 1: Line Item Analysis

For each line item in P&L and Balance Sheet data, calculate five key metrics:

#### 1. Materiality Score
```typescript
materiality = lineItem.total / companyTotal
// Ranges from 0 to 1, measures relative importance
```

#### 2. Variability Score  
```typescript
coefficientOfVariation = standardDeviation(monthlyValues) / mean(monthlyValues)
variability = clamp(coefficientOfVariation, 0, 2) / 2
// Normalized 0-1, measures consistency vs volatility
```

#### 3. Predictability Score
```typescript
// Fit trend line to historical data
trendLine = linearRegression(monthlyValues)
rSquared = calculateR2(monthlyValues, trendLine)
predictability = rSquared
// 0-1 score, higher = more predictable
```

#### 4. Growth Rate Impact
```typescript
growthRate = calculateCAGR(monthlyValues)
growthImpact = clamp(Math.abs(growthRate) * 5, 0, 1)
// Normalized score for growth/decline significance
```

#### 5. Data Quality Score
```typescript
nonZeroMonths = countNonZero(monthlyValues)
dataQuality = nonZeroMonths / totalMonthsAvailable
// 0-1 score, measures data completeness
```

### Step 2: Composite Scoring Formula

Combine individual metrics using weighted average:

```typescript
function calculateDriverScore(analysis: LineItemAnalysis): number {
  const materialityWeight = 0.3;    // Size matters most
  const variabilityWeight = 0.2;    // Need some movement
  const predictabilityWeight = 0.2; // Must be forecastable
  const growthWeight = 0.2;         // Growing/declining items important
  const dataQualityWeight = 0.1;    // Need reliable data
  
  return (
    analysis.materiality * materialityWeight +
    analysis.variability * variabilityWeight +
    analysis.predictability * predictabilityWeight +
    analysis.growthImpact * growthWeight +
    analysis.dataQuality * dataQualityWeight
  );
}
```

### Step 3: Driver Selection Criteria

Include drivers that meet ALL criteria:

```typescript
function shouldIncludeDriver(item: AnalyzedLineItem): boolean {
  return (
    item.score > 0.4 &&                    // Minimum composite score
    item.materiality > 0.01 &&             // At least 1% of business
    item.dataQuality > 0.5 &&              // At least 6 months data
    !isHighlyCorrelatedWithSelected(item)  // Not redundant
  );
}
```

### Step 4: Correlation Analysis & Consolidation

Group related line items that move together:

```typescript
function consolidateRelatedDrivers(drivers: DiscoveredDriver[]): DiscoveredDriver[] {
  const correlationThreshold = 0.8;
  const groups: DriverGroup[] = [];
  
  // Find correlation groups
  for (const driver of drivers) {
    const correlatedDrivers = drivers.filter(other => 
      calculateCorrelation(driver.monthlyValues, other.monthlyValues) > correlationThreshold
    );
    
    if (correlatedDrivers.length > 1) {
      groups.push(createCompositeDriver(correlatedDrivers));
    }
  }
  
  return groups;
}
```

## Forecast Method Assignment

Based on driver characteristics, assign appropriate forecasting techniques:

### Revenue Correlation Method
```typescript
if (correlationWithRevenue > 0.7) {
  return {
    method: 'percentage_of_revenue',
    parameters: {
      historicalRatio: calculateAverageRatio(driver, revenue),
      confidence: correlationWithRevenue
    }
  };
}
```

### Trend Extrapolation Method
```typescript
if (predictability > 0.8 && variability < 0.2) {
  return {
    method: 'trend_extrapolation',
    parameters: {
      monthlyGrowthRate: calculateTrendSlope(monthlyValues),
      seasonalAdjustments: detectSeasonality(monthlyValues)
    }
  };
}
```

### Seasonal Model Method
```typescript
if (hasSeasonalPattern(monthlyValues)) {
  return {
    method: 'seasonal_model',
    parameters: {
      seasonalIndices: calculateSeasonalIndices(monthlyValues),
      baselineGrowth: calculateTrendGrowth(deseasonalizedValues)
    }
  };
}
```

### Scenario Range Method
```typescript
if (variability > 0.5) {
  return {
    method: 'scenario_range',
    parameters: {
      conservativeValue: percentile(monthlyValues, 25),
      baseValue: mean(monthlyValues),
      aggressiveValue: percentile(monthlyValues, 75)
    }
  };
}
```

### Simple Growth Method
```typescript
// Fallback for smaller items
return {
  method: 'simple_growth',
  parameters: {
    annualGrowthRate: calculateSimpleGrowthRate(monthlyValues)
  }
};
```

## Data Structures

### Core Types

```typescript
interface DiscoveredDriver {
  // Identity
  name: string;
  category: 'revenue' | 'expense' | 'balance_sheet';
  quickbooksLineId?: string;
  
  // Analysis scores (0-1)
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
  methodParameters: any;
  confidence: 'high' | 'medium' | 'low';
  
  // Business context
  coverage: number;          // % of total business this represents
  businessType: string;      // e.g., "recurring_revenue", "variable_cost"
}
```

### Analysis Results

```typescript
interface DriverDiscoveryResult {
  // Discovered drivers
  drivers: DiscoveredDriver[];
  
  // Analysis summary
  summary: {
    driversFound: number;
    businessCoverage: number;        // % of business explained
    averageConfidence: number;
    monthsAnalyzed: number;
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
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
```

## Advanced Features

### Seasonality Detection

```typescript
function detectSeasonality(monthlyValues: number[]): SeasonalPattern | null {
  // Convert to year-over-year comparison
  const yoyGrowth = calculateYearOverYearGrowth(monthlyValues);
  
  // Look for consistent monthly patterns
  const monthlyAverages = groupByMonth(yoyGrowth);
  const seasonalVariance = calculateVariance(monthlyAverages);
  
  if (seasonalVariance > 0.1) {  // 10% threshold
    return {
      isseasonal: true,
      peakMonths: findPeakMonths(monthlyAverages),
      lowMonths: findLowMonths(monthlyAverages),
      seasonalIndices: normalizeToIndices(monthlyAverages)
    };
  }
  
  return null;
}
```

### Business Coverage Analysis

```typescript
function calculateBusinessCoverage(drivers: DiscoveredDriver[]): CoverageAnalysis {
  const totalRevenueCoverage = drivers
    .filter(d => d.category === 'revenue')
    .reduce((sum, d) => sum + d.materiality, 0);
    
  const totalExpenseCoverage = drivers
    .filter(d => d.category === 'expense')
    .reduce((sum, d) => sum + d.materiality, 0);
    
  return {
    revenueCoverage: totalRevenueCoverage,
    expenseCoverage: totalExpenseCoverage,
    overallCoverage: (totalRevenueCoverage + totalExpenseCoverage) / 2,
    missingCoverage: 1 - ((totalRevenueCoverage + totalExpenseCoverage) / 2)
  };
}
```

### Confidence Calculation

```typescript
function calculateConfidence(driver: DiscoveredDriver): 'high' | 'medium' | 'low' {
  const factors = [
    driver.predictability,
    driver.dataQuality,
    Math.min(driver.materiality * 2, 1), // Cap at 1
    1 - driver.variability  // Lower variability = higher confidence
  ];
  
  const averageConfidence = factors.reduce((sum, f) => sum + f, 0) / factors.length;
  
  if (averageConfidence > 0.7) return 'high';
  if (averageConfidence > 0.4) return 'medium';
  return 'low';
}
```

## Implementation Flow

1. **Data Ingestion**: Fetch P&L and Balance Sheet from QuickBooks
2. **Line Item Processing**: Analyze each financial line item
3. **Scoring**: Calculate composite scores for all items
4. **Selection**: Apply criteria to identify true drivers
5. **Consolidation**: Group correlated items together
6. **Method Assignment**: Choose forecast technique per driver
7. **Validation**: Ensure business coverage and data quality
8. **Output**: Return structured driver discovery results

## Performance Considerations

- **Caching**: Cache discovery results for 24 hours
- **Incremental Updates**: Only re-analyze when new QB data available
- **Parallel Processing**: Analyze line items in parallel
- **Early Termination**: Stop processing if data quality too poor
- **Memory Management**: Process large datasets in chunks

This systematic approach ensures that driver discovery is:
- **Objective**: Based on mathematical analysis, not assumptions
- **Consistent**: Same algorithm works for any business
- **Transparent**: Every score is explainable and auditable
- **Practical**: Results in actionable forecasting inputs