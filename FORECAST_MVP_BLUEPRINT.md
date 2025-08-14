# Forecast MVP Blueprint (Working Document)

*This is a living document that will evolve as we build and learn. Expect regular updates based on implementation discoveries and user feedback.*

## 🎯 Current Vision (Subject to Change)

### Core Goal
Generate **data-driven, comprehensive financial models** that fractional CFOs trust for client work. The model structure adapts to business complexity rather than using fixed templates.

### Working Principles
1. **Trust through Mathematical Integration**: 3-statement models with formula-linked relationships
2. **Relevance over Complexity**: Only create tabs that add value for the specific business
3. **Historical Foundation**: Use 3 years of QuickBooks data for credible assumptions
4. **Professional Grade**: Output quality suitable for CFO client presentations

### Success Target
**"30 hours to 30 minutes"** - A fractional CFO can generate a professional financial model they'd stake their reputation on in under 30 minutes.

## 🧠 Intelligent Structure Approach (v1.0)

### Core Insight
Instead of arbitrary tab counts, analyze QuickBooks data to determine what analysis this specific business actually needs.

```typescript
// This interface will evolve as we discover what signals matter
interface BusinessComplexityProfile {
  businessType: 'service' | 'product' | 'hybrid';
  seasonality: 'high' | 'moderate' | 'low';
  customerConcentration: 'high' | 'moderate' | 'low';
  cashComplexity: 'simple' | 'moderate' | 'complex';
  
  // These flags determine which tabs to generate
  requiresARAnalysis: boolean;        
  requiresSeasonalAnalysis: boolean;  
  requiresCustomerAnalysis: boolean;  
  requiresInventorySchedule: boolean; 
  requiresDebtSchedule: boolean;      
  requiresEquipmentSchedule: boolean; 
}
```

*Note: These categories and thresholds will be refined based on real data analysis.*

## 📊 Model Structure Framework (v1.0)

### Always Present Foundation
- **P&L Statement**: 3 years monthly + 12 month forecast
- **Balance Sheet**: Working capital focus
- **Cash Flow Statement**: Operating/investing/financing flows
- **Assumptions Hub**: Central control panel for all inputs

### Conditional Analysis (Based on Data)
**A/R Aging**: If receivables >$10K or >30 days average
**Seasonal Analysis**: If revenue variance >50% between months
**Customer Analysis**: If top 5 customers >50% of revenue
**Equipment Schedule**: If fixed assets >$25K
**Inventory Schedule**: If inventory >10% of assets
**Debt Schedule**: If multiple loans or >$50K total debt

*Note: These thresholds are initial guesses that will be calibrated with real data.*

## 🔧 Technical Architecture (Draft)

### Phase 1: Business Intelligence Engine
```typescript
class BusinessAnalysisService {
  // This will be heavily refined as we learn what signals matter
  async analyzeBusinessComplexity(companyId: string): Promise<BusinessComplexityProfile> {
    const qbData = await this.getComprehensiveQuickBooksData(companyId);
    
    return {
      businessType: this.classifyBusinessType(qbData), // TBD: How to classify
      seasonality: this.analyzeSeasonality(qbData.pnl), // TBD: What threshold
      // ... other analysis methods to be developed
    };
  }
}
```

### Phase 2: Three-Statement Integration
```typescript
class ThreeStatementIntegrator {
  // Core integration logic - this is well-established practice
  buildIntegratedModel(data: FinancialData, assumptions: BusinessAssumptions): IntegratedModel {
    // P&L -> Balance Sheet -> Cash Flow integration
    // Mathematical validation at each step
    // Return model with validation results
  }
}
```

### Phase 3: Dynamic Excel Generation
```typescript
class DynamicModelGenerator {
  // Structure will be determined by business analysis results
  async generateModel(companyId: string): Promise<ModelGenerationResult> {
    const profile = await this.analyzeComplexity(companyId);
    const structure = this.determineOptimalStructure(profile); // TBD
    // Generate Excel with appropriate tabs
  }
}
```

## 📋 MVP Development Plan (Flexible)

### Sprint 1: Foundation & Learning
- [ ] Build basic QuickBooks data extraction
- [ ] Analyze landscaping sandbox data to understand patterns
- [ ] Prototype business complexity detection
- [ ] **Validate assumptions with real data**

### Sprint 2: Core Integration
- [ ] Implement three-statement mathematical integration
- [ ] Build validation and error checking
- [ ] Test with landscaping data
- [ ] **Refine based on integration challenges discovered**

### Sprint 3: Dynamic Structure
- [ ] Build Excel generation with variable tab structure
- [ ] Implement conditional analysis tabs
- [ ] Test end-to-end with sandbox data
- [ ] **Adjust structure rules based on output quality**

### Sprint 4: Polish & Validation
- [ ] Professional formatting and validation
- [ ] Fractional CFO testing and feedback
- [ ] **Major refinements based on professional feedback**

## 🎯 Learning Checkpoints

### After Sprint 1
- [ ] What patterns actually exist in landscaping QB data?
- [ ] Do our complexity signals make sense?
- [ ] What analysis would actually be valuable?

### After Sprint 2  
- [ ] How complex is three-statement integration in practice?
- [ ] What validation checks are actually needed?
- [ ] Are we missing any critical financial relationships?

### After Sprint 3
- [ ] Does dynamic structure feel right or arbitrary?
- [ ] What tabs do users actually want vs what we think they need?
- [ ] How does Excel performance handle our generated complexity?

### After Sprint 4
- [ ] Would fractional CFOs actually use this?
- [ ] What's missing for professional credibility?
- [ ] What should we build next?

## 🔄 Expected Changes

### Things We Expect to Change
- **Complexity thresholds**: Our guesses about when to add tabs
- **Business classification logic**: How we determine business type
- **Tab structure**: What goes in each sheet
- **Assumption calculations**: How we derive forecast inputs
- **User experience flow**: The entire generation process

### Things We Expect to Stay Stable
- **Three-statement integration**: Well-established financial modeling practice
- **QuickBooks as data source**: This won't change
- **Excel as output format**: CFOs expect Excel
- **Professional quality requirement**: Output must be CFO-grade

## 📊 Success Metrics (Evolving)

### Technical Validation
- [ ] Data accuracy matches QuickBooks
- [ ] Mathematical integration works correctly
- [ ] Excel formulas enable scenario analysis
- [ ] Generation completes in reasonable time

### Business Validation  
- [ ] CFO feedback: "I would use this"
- [ ] Time savings vs manual process
- [ ] Professional quality assessment
- [ ] **Actual usage in real CFO workflows**

### Learning Validation
- [ ] Our assumptions about complexity prove correct
- [ ] Dynamic structure feels intelligent, not arbitrary
- [ ] Users understand why tabs were included/excluded
- [ ] **Model provides insights users didn't expect**

## 🚧 Known Unknowns

### Questions We Need to Answer
1. **Business Type Detection**: Can we reliably classify businesses from QB data?
2. **Complexity Thresholds**: What signals actually indicate need for additional analysis?
3. **Professional Standards**: What makes a model "CFO-grade" vs amateur?
4. **Scenario Value**: Which scenarios are actually useful vs theoretical?
5. **Integration Challenges**: What breaks when we link three statements programmatically?

### Research Needed
- Study actual fractional CFO workflows
- Analyze multiple QB datasets to find patterns
- Test mathematical integration with edge cases
- Validate professional quality with real CFOs

## 📝 Decision Log

### Decisions Made
- **Start with service businesses** (landscaping sandbox data available)
- **Dynamic structure over fixed templates** (more intelligent, harder to build)
- **Excel output format** (familiar to CFOs)
- **Three-statement integration required** (professional credibility)

### Decisions Deferred
- **Exact complexity thresholds** (need real data analysis)
- **Business type classification method** (manual vs AI vs rules)
- **Scenario templates** (depends on what proves valuable)
- **Professional formatting standards** (iterative based on feedback)

---

**This blueprint will be updated regularly as we build, test, and learn. The goal is to remain flexible while maintaining clear direction toward a professional-grade financial modeling tool.**

*Last updated: [Date] - Next review: After Sprint 1 completion*