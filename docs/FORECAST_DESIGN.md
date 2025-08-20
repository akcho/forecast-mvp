# FORECAST_DESIGN.md

# Driver-Based Forecasting Tool Design Document

**Version**: 1.0  
**Date**: August 20, 2025  
**Status**: Design Phase

---

## Executive Summary

### Vision
Create an intuitive, confidence-inspiring forecasting tool that helps small-medium business owners understand their financial future based on the key drivers we discovered. The tool should feel like having a trusted financial advisor who explains complex concepts simply while letting users maintain full control over their business assumptions.

### Core Philosophy: The "Flexible Canvas" Approach
Instead of attempting to predict complex economic relationships (tariffs → elasticity → customer behavior), we provide a transparent calculation framework where users express their own business knowledge. We discover financial drivers from their data, then let them layer on adjustments based on their understanding of external factors.

**Key Principle**: We are a sophisticated calculator with memory, not a crystal ball.

### Why This Approach?
- **Trust**: Users trust their own assumptions more than algorithmic predictions
- **Safety**: Avoids potentially catastrophic economic modeling errors
- **Transparency**: Every number can be traced to its source
- **Flexibility**: Works for any business, any external factor
- **Simplicity**: Clean mental model for users to understand

---

## Target User Profile

### Primary User: Small-Medium Business Owner
- **Revenue**: $500K - $5M annually
- **Employees**: 5-50 people
- **Pain Points**:
  - Cash flow uncertainty
  - External shocks (regulations, tariffs, competition)
  - Growth investment decisions
  - Seasonal planning challenges
- **Financial Sophistication**: Moderate (understands P&L, not econometrics)
- **Tool Usage**: Primarily monthly/quarterly planning sessions

### User Mental Model
*"I know my business. I know what's happening in my market. I know my customers. I don't need software to predict these things - I need software to help me see what my decisions mean for my cash flow and runway."*

---

## Complete User Journey

### Phase 1: Driver Discovery (Already Implemented)
1. Connect QuickBooks
2. System analyzes historical data
3. Discover 5-10 key financial drivers
4. User reviews discovered drivers on `/drivers` page

### Phase 2: Base Forecasting (This Design)
1. Navigate to `/forecast` page
2. See 12-month projection based on discovered drivers
3. Review assumptions powering the forecast
4. Understand confidence levels and data sources

### Phase 3: Adjustment Modeling
1. Add external factor adjustments to specific drivers
2. See real-time impact on projections
3. Create multiple scenarios for comparison
4. Export scenarios for stakeholder review

### Phase 4: Decision Making
1. Compare scenarios side-by-side
2. Identify critical decision points
3. Set up monitoring alerts
4. Export executive summaries

---

## System Architecture Overview

### Data Flow
```
QuickBooks Data → DriverDiscoveryService → DiscoveredDrivers
                                              ↓
UserAdjustments → DriverForecastService → ForecastProjections
                                              ↓
                       ForecastDashboard → Visual Interface
```

### Core Components
1. **DriverForecastService**: Combines discovered drivers with user adjustments
2. **AdjustmentEngine**: Manages user-defined modifications to drivers
3. **ScenarioManager**: Handles multiple forecast scenarios
4. **ForecastDashboard**: Interactive UI for visualization and control
5. **CalculationTracker**: Maintains audit trail for all projections

---

## Detailed Component Specifications

### 1. DriverForecastService

**Purpose**: Transform discovered drivers plus user adjustments into 12-month financial projections.

```typescript
interface DriverForecastService {
  // Generate base forecast from discovered drivers
  generateBaseForecast(
    drivers: DiscoveredDriver[], 
    monthsToProject: number
  ): BaseForecast

  // Apply user adjustments to base forecast
  applyAdjustments(
    baseForecast: BaseForecast,
    adjustments: DriverAdjustment[]
  ): AdjustedForecast

  // Generate multiple scenarios
  generateScenarioComparison(
    baseForecast: BaseForecast,
    scenarios: Scenario[]
  ): ScenarioComparison
}

interface BaseForecast {
  drivers: ProjectedDriver[]
  monthlyProjections: MonthlyProjection[]
  summary: ForecastSummary
  confidence: ConfidenceMetrics
}

interface ProjectedDriver {
  name: string
  category: 'revenue' | 'expense'
  historicalTrend: number  // Monthly growth rate
  monthlyValues: number[]  // 12-month projection
  confidence: 'high' | 'medium' | 'low'
  dataSource: 'quickbooks_history' | 'user_adjustment'
}

interface MonthlyProjection {
  month: string
  date: Date
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  cashFlow: number
  runwayMonths: number
  driverBreakdown: {
    [driverName: string]: number
  }
}
```

### 2. Driver Adjustment System

**Purpose**: Allow users to layer custom modifications on top of discovered drivers.

```typescript
interface DriverAdjustment {
  id: string
  driverId: string  // Which discovered driver this affects
  label: string     // User-friendly name like "Import Tariffs"
  impact: number    // Percentage change (0.25 = +25%)
  startDate: Date
  endDate?: Date    // Optional for temporary adjustments
  note?: string     // User explanation
  createdBy: string
  createdAt: Date
  modifiedAt: Date
}

interface AdjustmentCalculation {
  baseValue: number
  historicalGrowth: number
  adjustments: AppliedAdjustment[]
  finalValue: number
  calculationPath: string  // For transparency
}

interface AppliedAdjustment {
  label: string
  impact: number
  appliedValue: number
}
```

### 3. Scenario Management

```typescript
interface Scenario {
  id: string
  name: string
  description?: string
  adjustments: DriverAdjustment[]
  createdAt: Date
  isDefault: boolean
}

interface ScenarioComparison {
  scenarios: Scenario[]
  projections: {
    [scenarioId: string]: MonthlyProjection[]
  }
  summary: ScenarioSummary
}

interface ScenarioSummary {
  revenueRange: { min: number, max: number }
  netIncomeRange: { min: number, max: number }
  runwayRange: { min: number, max: number }
  keyDifferences: string[]
}
```

---

## User Interface Design

### Main Forecast Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    📈 Financial Forecast                    │
├─────────────────────────────────────────────────────────────┤
│  [Base Case ▼] vs [Tariff Impact ▼] vs [+ New Scenario]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 PROJECTION CHART (12 months)                           │
│      Revenue Line                                           │
│      Expenses Line                                          │
│      Net Income Line                                        │
│      Confidence Bands                                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  💰 KEY METRICS                                            │
│  [Total Revenue] [Net Income] [Cash Runway] [Break-even]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎛️ DRIVER CONTROLS                                        │
│                                                             │
│  Revenue Drivers:                                           │
│  ┌─ Service Income: $45K/mo ──────────[====●────] +15%    │
│  │  Adjustments: Base growth +3%/mo                       │
│  │  [+ Add adjustment]                                    │
│  └─ Growth confidence: High                                │
│                                                             │
│  Expense Drivers:                                           │
│  ┌─ Materials: $12K/mo ─────────────[●────────] 0%        │
│  │  Adjustments: Base growth +2%/mo                       │
│  │               Tariffs +25% starting Apr                │
│  │  [+ Add adjustment] [Edit: Tariffs]                    │
│  └─ Growth confidence: Medium                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🔍 SCENARIO INSIGHTS                                      │
│  • Revenue increases 15% by December                       │
│  • Materials costs jump 25% in April due to tariffs       │
│  • Cash runway: 14 months in base case, 11 in tariff case │
│  • Break-even: Month 8 (3 months later than base)         │
└─────────────────────────────────────────────────────────────┘
```

### Driver Adjustment Interface

When user clicks "[+ Add adjustment]":

```
┌─────────────────────────────────────────────────────────────┐
│  Add Adjustment to "Materials & Supplies"                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  What's happening?                                          │
│  [Import tariffs on steel components           ]            │
│                                                             │
│  Impact on monthly costs:                                   │
│  [-50%] ◄──────────●──────────► [+50%]  +25%              │
│                                                             │
│  When does it start?                                        │
│  [April 2025        ▼]                                     │
│                                                             │
│  Duration:                                                  │
│  ● Permanent    ○ Temporary until [        ▼]              │
│                                                             │
│  Optional note:                                             │
│  [25% tariffs announced on Chinese steel imports]          │
│                                                             │
│  ┌─ Impact Preview ─────────────────────────────────────┐  │
│  │ Materials will go from $12K → $15K starting April   │  │
│  │ Annual additional cost: ~$36K                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│                              [Cancel] [Add Adjustment]     │
└─────────────────────────────────────────────────────────────┘
```

### Calculation Transparency

When user hovers over any projected value:

```
┌─────────────────────────────────────────────────────────────┐
│  May 2025: $15,555                                         │
├─────────────────────────────────────────────────────────────┤
│  How we calculated this:                                    │
│                                                             │
│  Base (from your data):           $12,000                  │
│  Historical trend (3 months):     × 1.06  (+2%/month)     │
│  = History-based projection:      $12,720                  │
│                                                             │
│  Your adjustment "Import tariffs": × 1.25  (+25%)         │
│  = Final projection:              $15,900                  │
│                                                             │
│  Confidence: Medium (based on 67% data quality)            │
│                                                             │
│  [Edit Calculation] [View Data Source]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## The Adjustment Layer System

### Core Concept
Users can add multiple adjustments to any discovered driver. Each adjustment is a simple transformation applied in sequence.

### Adjustment Types

1. **Percentage Impact**
   - Most common: +25%, -10%, etc.
   - Applied as multiplicative factor
   - Can be positive or negative

2. **Fixed Amount**
   - Add/subtract specific dollar amount
   - Useful for one-time costs or known changes
   - Examples: "+$5K/month marketing spend"

3. **Seasonal Pattern**
   - Multiply by different factors by month
   - Example: +20% summer, -30% winter
   - Override historical seasonality

4. **Growth Rate Change**
   - Modify the underlying growth trend
   - Example: Change from +3%/month to +5%/month
   - Applied going forward from start date

### Calculation Method

For any driver in any month:

```
projected_value = base_historical_value 
  × (1 + historical_growth_rate) ^ months_from_base
  × (1 + adjustment_1.impact)
  × (1 + adjustment_2.impact)
  × ...
  + fixed_adjustment_1
  + fixed_adjustment_2
  × seasonal_multiplier[month]
```

### Adjustment Inheritance
- Adjustments persist month-to-month once applied
- Users can set start/end dates for temporary effects
- System shows clear timeline of when adjustments are active

---

## Trust & Transparency Features

### 1. Source Attribution
Every number shows where it came from:
- **Historical data**: "Based on 18 months QuickBooks data"
- **Trend extrapolation**: "Continuing your 3%/month growth pattern"
- **User adjustment**: "Your assumption: +25% tariff impact"

### 2. Calculation Audit Trail
```typescript
interface CalculationStep {
  step: string
  operation: 'multiply' | 'add' | 'trend'
  value: number
  source: 'quickbooks' | 'user_adjustment' | 'trend_analysis'
  description: string
}
```

### 3. Confidence Indicators
- **High**: Strong historical data, predictable patterns
- **Medium**: Some data gaps or variability
- **Low**: Limited data or high volatility

### 4. Reality Check Prompts (Not Predictions)
```
⚠️ Heads up:
• Materials increasing 25% but Revenue unchanged
• Consider if you'll need to adjust pricing

[This is just a reminder, not a prediction]
```

### 5. What We DON'T Do
Clear disclaimers about our limitations:
- ❌ Predict customer behavior
- ❌ Model market elasticity
- ❌ Forecast economic conditions
- ❌ Calculate competitive responses

---

## Scenario Management System

### Default Scenarios
Every user gets three pre-configured scenarios:

1. **Base Case**
   - Historical trends continue
   - No external adjustments
   - Conservative confidence

2. **Growth Scenario**
   - Slightly optimistic assumptions
   - 20% boost to primary revenue drivers
   - User can customize

3. **Downturn Scenario**
   - Defensive assumptions
   - 15% reduction in revenue drivers
   - 10% increase in cost drivers

### Custom Scenarios
Users can create unlimited custom scenarios:
- Clone existing scenarios
- Name them meaningfully ("Tariff Impact", "New Product Launch")
- Save and share with team members

### Scenario Comparison View
```
┌─────────────────────────────────────────────────────────────┐
│  Scenario Comparison                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│           │ Base Case │ Tariff Impact │ Growth Plan         │
│  ─────────┼───────────┼───────────────┼──────────────────   │
│  Dec 2025 │           │               │                     │
│  Revenue  │   $540K   │     $513K     │      $648K          │
│  Expenses │   $420K   │     $465K     │      $456K          │
│  Profit   │   $120K   │      $48K     │      $192K          │
│  Runway   │  18 months│   12 months   │    24 months        │
│                                                             │
│  📊 [Visual comparison chart]                               │
│                                                             │
│  Key Differences:                                           │
│  • Tariff scenario reduces profit by 60%                   │
│  • Growth plan requires $36K additional investment         │
│  • Break-even delayed 4 months in tariff scenario          │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation Details

### API Endpoints

```typescript
// Get base forecast from discovered drivers
GET /api/forecast/base
Response: BaseForecast

// Apply adjustments to forecast
POST /api/forecast/apply-adjustments
Body: { adjustments: DriverAdjustment[] }
Response: AdjustedForecast

// Manage scenarios
GET /api/forecast/scenarios
POST /api/forecast/scenarios
PUT /api/forecast/scenarios/:id
DELETE /api/forecast/scenarios/:id

// Get scenario comparison
POST /api/forecast/compare-scenarios
Body: { scenarioIds: string[] }
Response: ScenarioComparison
```

### State Management

Using React Context + useReducer for forecast state:

```typescript
interface ForecastState {
  discoveredDrivers: DiscoveredDriver[]
  baseForecast: BaseForecast | null
  currentScenario: Scenario
  allScenarios: Scenario[]
  adjustments: DriverAdjustment[]
  projections: MonthlyProjection[]
  loading: boolean
  error: string | null
}

type ForecastAction = 
  | { type: 'LOAD_DRIVERS'; payload: DiscoveredDriver[] }
  | { type: 'ADD_ADJUSTMENT'; payload: DriverAdjustment }
  | { type: 'UPDATE_ADJUSTMENT'; payload: { id: string; update: Partial<DriverAdjustment> } }
  | { type: 'DELETE_ADJUSTMENT'; payload: string }
  | { type: 'SWITCH_SCENARIO'; payload: string }
  | { type: 'CREATE_SCENARIO'; payload: Scenario }
```

### Performance Considerations

1. **Real-time Calculations**: Debounce adjustment changes (300ms)
2. **Chart Updates**: Use React.memo for expensive chart components
3. **Caching**: Cache base forecasts, recalculate only adjustments
4. **Pagination**: Load 12 months initially, extend on demand

### Mobile Responsiveness

- Stack driver controls vertically on mobile
- Simplify chart interactions for touch
- Priority information first (key metrics)
- Collapsible sections for driver details

---

## Data Models

### Core TypeScript Interfaces

```typescript
// Extend existing DiscoveredDriver with forecast capabilities
interface ForecastableDriver extends DiscoveredDriver {
  baseProjection: number[]  // 12-month base case
  adjustments: DriverAdjustment[]
  projectedValues: number[]  // After applying adjustments
}

interface DriverAdjustment {
  id: string
  driverId: string
  label: string
  type: 'percentage' | 'fixed_amount' | 'growth_rate_change' | 'seasonal'
  impact: number | SeasonalImpact
  startDate: Date
  endDate?: Date
  note?: string
  createdBy: string
  createdAt: Date
  modifiedAt: Date
}

interface SeasonalImpact {
  [month: string]: number  // Jan: 1.2, Feb: 0.8, etc.
}

interface MonthlyProjection {
  month: string
  date: Date
  drivers: {
    [driverName: string]: {
      value: number
      calculation: CalculationStep[]
      confidence: 'high' | 'medium' | 'low'
    }
  }
  totals: {
    revenue: number
    expenses: number
    netIncome: number
    cashFlow: number
    runwayMonths: number
  }
}

interface CalculationStep {
  operation: string
  value: number
  source: 'historical' | 'trend' | 'user_adjustment'
  description: string
  adjustmentId?: string
}

interface Scenario {
  id: string
  name: string
  description?: string
  adjustments: DriverAdjustment[]
  projections?: MonthlyProjection[]
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

interface ScenarioComparison {
  scenarios: Scenario[]
  monthlyComparisons: MonthlyComparison[]
  summary: ComparisonSummary
}

interface MonthlyComparison {
  month: string
  date: Date
  scenarios: {
    [scenarioId: string]: {
      revenue: number
      expenses: number
      netIncome: number
      cashFlow: number
    }
  }
}

interface ComparisonSummary {
  revenueRange: { min: number; max: number; scenarios: string[] }
  expenseRange: { min: number; max: number; scenarios: string[] }
  profitRange: { min: number; max: number; scenarios: string[] }
  runwayRange: { min: number; max: number; scenarios: string[] }
  keyInsights: string[]
}
```

---

## Future Enhancement Opportunities

### Phase 2 Features

1. **Smart Suggestions**
   - AI-powered prompts: "Consider price adjustments for cost increases"
   - Industry benchmarks: "Similar businesses see 5-10% customer loss"
   - Pattern recognition: "This looks like a seasonal adjustment"

2. **Advanced Visualization**
   - Waterfall charts showing adjustment impacts
   - Sensitivity analysis: "Which driver matters most?"
   - Monte Carlo simulations for uncertainty

3. **Collaboration Features**
   - Share scenarios with stakeholders
   - Comment threads on adjustments
   - Approval workflows for major assumptions

4. **Integration Enhancements**
   - Import actual results to validate projections
   - Connect to other financial tools
   - Export to Excel/Google Sheets with formulas

### Phase 3 Features

1. **Industry Intelligence**
   - Industry-specific adjustment templates
   - Regulatory change alerts
   - Market trend integration

2. **Advanced Analytics**
   - Goal-seeking: "What growth rate hits $1M revenue?"
   - Optimization: "Best path to profitability"
   - Risk scoring: "Likelihood of cash crunch"

3. **Automated Insights**
   - Anomaly detection in projections
   - Cash flow early warnings
   - Investment timing recommendations

---

## Success Metrics

### User Engagement
- Time spent in forecasting tool
- Number of scenarios created per user
- Frequency of assumption adjustments
- Feature adoption rates

### Business Impact
- Improved cash flow planning accuracy
- Faster decision-making on investments
- Reduced financial surprises
- User retention and subscription growth

### Quality Metrics
- Forecast accuracy vs actual results
- User satisfaction with transparency
- Reduction in support requests about calculations
- User confidence in projections

---

## Implementation Roadmap

### Sprint 1: Foundation (2 weeks)
- DriverForecastService implementation
- Basic projection calculations
- Simple UI with driver displays

### Sprint 2: Adjustments (2 weeks)
- Adjustment creation interface
- Real-time calculation updates
- Transparency tooltips

### Sprint 3: Scenarios (2 weeks)
- Scenario management system
- Comparison interface
- Export functionality

### Sprint 4: Polish (1 week)
- Mobile responsiveness
- Performance optimization
- User testing and refinement

### Sprint 5: Advanced Features (2 weeks)
- Confidence intervals
- Advanced chart interactions
- Smart suggestions

---

## Conclusion

This driver-based forecasting tool positions us uniquely in the market by focusing on user-controlled transparency rather than algorithmic prediction. By giving small-medium business owners the tools to express their business knowledge clearly and see its implications immediately, we provide genuine value without the risk of harmful predictions.

The flexible adjustment layer approach ensures we can handle any external factor (tariffs, regulations, competition) without hardcoding economic assumptions. Users maintain control, we provide clarity, and everyone wins.

**Next Steps**: Begin implementation with Sprint 1, starting with the DriverForecastService and basic UI components.