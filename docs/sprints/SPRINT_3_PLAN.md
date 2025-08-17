# Sprint 3: Driver-Based Forecasting Implementation

## Objective
Replace complex financial modeling with data-driven driver discovery that shows users what actually drives their business.

## Strategic Context
After analyzing best forecasting practices from industry experts, we're pivoting from complex cash flow modeling to driver-based forecasting - the #1 recommended technique for finance professionals.

## Key Principles
1. **Let Data Speak**: No assumptions, only analyze actual QuickBooks data
2. **Systematic Approach**: Same algorithm works for any business size/type
3. **Transparency**: Users see exactly why each driver matters
4. **Simplicity**: Focus on drivers, not complex financial statements
5. **Actionability**: Users can understand and adjust what drives their business

## Phase 1: Driver Discovery Engine ⏳

### Core Service Implementation
- [ ] **Create DriverDiscoveryService.ts**
  - Analyze every P&L and Balance Sheet line item
  - Calculate materiality, variability, predictability scores
  - Determine correlation with revenue and other drivers
  - Apply systematic scoring algorithm

- [ ] **Implement Analysis Methods**
  - `analyzeLineItem()` - Core scoring for individual items
  - `calculateDriverScore()` - Composite scoring algorithm
  - `detectSeasonality()` - Identify seasonal patterns
  - `findCorrelations()` - Group related items

- [ ] **Build Driver Selection Logic**
  - `consolidateRelatedDrivers()` - Merge highly correlated items
  - `determineOptimalDriverCount()` - Data-driven driver selection
  - `assignForecastMethod()` - Match forecast technique to driver type

### Scoring Algorithm Implementation
```typescript
Score = (Materiality × 0.3) + 
        (Variability × 0.2) + 
        (Predictability × 0.2) + 
        (Growth Rate × 0.2) + 
        (Data Quality × 0.1)

Include criteria:
- Score > 0.4
- Materiality > 1% of business
- At least 6 months of data
- Not highly correlated (>0.8) with another selected driver
```

## Phase 2: API Integration ⏳

### New Endpoint Creation
- [ ] **Create `/api/quickbooks/discover-drivers`**
  - Fetch P&L and Balance Sheet data from QuickBooks
  - Run driver discovery analysis
  - Cache results for performance
  - Return comprehensive driver metrics

### Data Integrity
- [ ] **Fix QuickBooks Data Extraction**
  - Remove ALL hardcoded fallback values
  - Ensure real cash balance extraction
  - Proper error handling when QB data unavailable
  - User feedback for data quality issues

### Response Format
```json
{
  "discoveredDrivers": [
    {
      "name": "Service Revenue",
      "category": "revenue",
      "impactScore": 89,
      "materiality": 0.65,
      "monthlyValues": [...],
      "trend": "growing",
      "growthRate": 0.12,
      "forecastMethod": "exponential_trend",
      "confidence": "high",
      "correlationWithRevenue": 1.0
    }
  ],
  "analysis": {
    "driversFound": 7,
    "businessCoverage": 0.92,
    "dataQuality": "good",
    "monthsAnalyzed": 24,
    "recommendedApproach": "driver_based_forecasting"
  }
}
```

## Phase 3: UI Replacement ⏳

### New Dashboard Component
- [ ] **Create DriverDashboard.tsx** (replaces ForecastContentEnhanced)
  - Clean, focused interface showing discovered drivers
  - Driver cards with sparklines and key metrics
  - Driver insights table with detailed analysis

### UI Sections
1. **Discovery Results Header**
   ```
   📊 Discovered Business Drivers
   We analyzed 24 months of your data and found 7 key drivers 
   that explain 92% of your business performance
   ```

2. **Driver Cards Grid**
   - Driver name and category
   - Impact score (0-100)
   - Trend sparkline
   - Variability indicator
   - Forecast method
   - Coverage percentage

3. **Driver Insights Table**
   - Historical values
   - Correlation metrics
   - Confidence levels
   - Suggested forecast approach

## Phase 4: Forecast Generation ⏳

### Simple Assumption Controls
- [ ] **Build Driver Assumption Inputs**
  - Growth rate sliders for trending drivers
  - Percentage of revenue inputs for correlated drivers
  - Absolute value inputs for fixed costs
  - Scenario toggles (Conservative/Base/Aggressive)

- [ ] **Create Forecast Output**
  - Revenue projection based on driver assumptions
  - Expense projection using driver methods
  - Simple cash runway calculation
  - Confidence intervals per scenario

### Forecast Methods per Driver Type
- **High Revenue Correlation (>0.7)**: Percentage of revenue method
- **High Predictability (>0.8)**: Trend extrapolation
- **Seasonal Pattern**: Seasonal adjustment model
- **High Variability (>0.5)**: Scenario range approach
- **Low Importance (<5%)**: Simple growth rate

## Deprecation Plan 🗑️

### Components to Remove
- ❌ **CashFlowStatement.tsx** - Overly complex 3-statement modeling
- ❌ **ForecastContentEnhanced.tsx** - Confusing multi-tab interface
- ❌ **Complex service classes** that don't connect to real drivers:
  - ServiceBusinessForecaster.ts (too generic)
  - WorkingCapitalModeler.ts (too detailed for initial forecast)
  - AssetProjectionModeler.ts (not a key driver for most businesses)

### Data to Remove
- ❌ All hardcoded demo data
- ❌ Fallback values (like $140,000 cash)
- ❌ Random data generation for missing values

## Success Criteria

### Technical
- [ ] All driver discovery runs on real QuickBooks data
- [ ] Zero hardcoded fallback values
- [ ] Driver selection is purely data-driven
- [ ] Forecast accuracy improves with actual business drivers
- [ ] Performance: Driver discovery completes in <5 seconds

### User Experience
- [ ] Users understand what drives their business
- [ ] Forecast inputs are intuitive and actionable
- [ ] Results are explainable ("because X increased, Y will happen")
- [ ] Simplified interface requires no training

### Business Value
- [ ] Forecasts based on actual business drivers, not generic models
- [ ] Users can make informed decisions about business drivers
- [ ] Clear insights into what matters vs what doesn't
- [ ] Scalable approach works for any business size/type

## Implementation Timeline

**Week 1**: DriverDiscoveryService + API endpoint
**Week 2**: DriverDashboard UI + data integration
**Week 3**: Forecast generation + assumption controls
**Week 4**: Testing, refinement, and deprecation cleanup

## Files to Create/Modify

### New Files
- `/src/lib/services/DriverDiscoveryService.ts`
- `/src/app/api/quickbooks/discover-drivers/route.ts`
- `/src/components/DriverDashboard.tsx`
- `/src/types/driverTypes.ts`

### Files to Modify
- `/src/app/forecast/page.tsx` - Use DriverDashboard
- `/src/components/ForecastContentEnhanced.tsx` - Replace or remove

### Files to Remove (Later)
- `/src/components/CashFlowStatement.tsx`
- Complex service classes that aren't driver-focused

This sprint transforms our forecast from complex financial statements to actionable business insights based on what actually drives the user's specific business.