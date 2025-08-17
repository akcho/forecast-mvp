# TODO List - Forecast MVP

Last updated: 2025-08-17

## 🎯 SPRINT 3: Driver-Based Forecasting Implementation

**Strategic Pivot**: Replacing complex cash flow modeling with data-driven driver discovery based on industry best practices.

### 🔥 Current Sprint (In Progress)

#### Phase 1: Driver Discovery Engine
- [ ] **Create DriverDiscoveryService.ts** 
  - Systematic analysis of every QuickBooks line item
  - Scoring algorithm: Materiality + Variability + Predictability + Growth + Data Quality
  - Correlation analysis to group related items
  - Forecast method assignment per driver type

- [ ] **Fix QuickBooks Data Extraction**
  - Remove ALL hardcoded fallback values (e.g., $140,000 cash balance)
  - Ensure real cash balance extraction from Balance Sheet
  - Proper error handling when QB data unavailable
  - User feedback for data quality issues

#### Phase 2: API Integration  
- [ ] **Create `/api/quickbooks/discover-drivers` endpoint**
  - Fetch P&L and Balance Sheet data from QuickBooks
  - Run driver discovery analysis
  - Cache results for performance
  - Return comprehensive driver metrics and recommendations

#### Phase 3: UI Replacement
- [ ] **Create DriverDashboard.tsx** (replaces ForecastContentEnhanced)
  - Driver discovery results header
  - Driver cards grid with sparklines and impact scores
  - Driver insights table with detailed analysis
  - Simple, focused interface

- [ ] **Update forecast/page.tsx**
  - Replace ForecastContentEnhanced with DriverDashboard
  - Remove complex multi-tab interface

#### Phase 4: Deprecation Cleanup
- [ ] **Remove deprecated components**
  - CashFlowStatement.tsx (overly complex)
  - Complex service classes that don't connect to real drivers
  - All hardcoded demo data and fallback values

### 📋 Type Definitions Needed
- [ ] **Create `/src/types/driverTypes.ts`**
  - DiscoveredDriver interface
  - DriverDiscoveryResult interface  
  - ForecastMethod types
  - Analysis score types

### 📊 Documentation Status
- [x] **CLAUDE.md updated** with Sprint 3 pivot explanation
- [x] **SPRINT_3_PLAN.md created** with implementation details
- [x] **DRIVER_DISCOVERY_DESIGN.md created** with technical design
- [x] **FORECAST_MVP_BLUEPRINT.md updated** with new approach
- [x] **TODO.md updated** with current Sprint 3 tasks

## ✅ SPRINT 2 COMPLETED (August 2025)
- [x] FinancialDataParser for structured QB data extraction
- [x] TrendAnalyzer for historical pattern analysis  
- [x] ExpenseCategorizer for behavioral expense analysis
- [x] ForecastEngine for 3-scenario projections
- [x] ServiceBusinessForecaster for revenue modeling
- [x] WorkingCapitalModeler for A/R, A/P projections
- [x] AssetProjectionModeler for capex and depreciation
- [x] CashFlowStatementService for comprehensive integration
- [x] 9 test endpoints for validation
- [x] Enhanced forecast tab with visual components
- [x] Fixed metrics tab runtime errors

## 🗑️ DEPRECATED (Being Removed)
- ❌ Complex 3-statement cash flow modeling approach
- ❌ CashFlowStatement.tsx component
- ❌ ForecastContentEnhanced.tsx multi-tab interface  
- ❌ Hardcoded fallback values throughout codebase
- ❌ Generic service classes not tied to actual business drivers

## 🎯 Success Criteria for Sprint 3
- [ ] Driver discovery runs on 100% real QuickBooks data (zero fallbacks)
- [ ] Users see what actually drives their specific business
- [ ] Driver selection is purely data-driven (no arbitrary counts)
- [ ] Simplified UI that's intuitive without training
- [ ] Forecast accuracy improves with actual business drivers

---

**Focus**: Build data-driven driver discovery that shows users what matters in their business, replacing complex financial modeling with actionable insights.