/**
 * CashFlowStatementService - Integrates all financial services to generate comprehensive cash flow statements
 * Combines P&L projections, working capital changes, capital expenditures, and financing activities
 */

import { ParsedProfitLoss } from '../types/financialModels';
import { ForecastEngine, ForecastedMonth, ForecastScenario } from './ForecastEngine';
import { TrendAnalyzer, TrendAnalysis, ExpenseBreakdown } from './TrendAnalyzer';
import { ExpenseCategorizer, CategorizedExpenses } from './ExpenseCategorizer';
import { ServiceBusinessForecaster, ServiceBusinessMetrics, ServiceBusinessAssumptions } from './ServiceBusinessForecaster';
import { WorkingCapitalModeler, WorkingCapitalComponents, WorkingCapitalAssumptions, WorkingCapitalProjection } from './WorkingCapitalModeler';
import { AssetProjectionModeler, AssetCategory, CapitalExpenditureAssumptions, AssetProjection } from './AssetProjectionModeler';

export interface CashFlowScenarioAssumptions {
  scenario: ForecastScenario;
  
  // Revenue and growth assumptions
  revenueGrowthAssumptions: {
    monthlyGrowthRate: number;
    seasonalAdjustments: { [month: string]: number };
    customerGrowthRate: number;
    avgRevenuePerCustomer: number;
  };
  
  // Expense and operational assumptions
  expenseAssumptions: {
    variableCostRatio: number;
    fixedCostInflation: number;
    categoryInflationRates: { [category: string]: number };
  };
  
  // Working capital assumptions
  workingCapitalAssumptions: WorkingCapitalAssumptions;
  
  // Capital expenditure assumptions
  capexAssumptions: CapitalExpenditureAssumptions;
  
  // Economic scenario factors
  economicConditions: {
    marketConditions: 'stable' | 'expanding' | 'contracting';
    confidenceLevel: 'high' | 'medium' | 'low';
    industryGrowthRate: number;
  };
}

export interface MonthlyOperatingCashFlow {
  month: string;
  date: Date;
  scenario: ForecastScenario;
  
  // Operating Activities
  operatingActivities: {
    netIncome: number;
    
    // Non-cash adjustments
    depreciation: number;
    amortization: number;
    
    // Working capital changes
    accountsReceivableChange: number;
    inventoryChange: number;
    accountsPayableChange: number;
    
    // Other operating adjustments
    prepaidExpensesChange: number;
    accruedLiabilitiesChange: number;
    
    netCashFromOperations: number;
  };
  
  // Investing Activities
  investingActivities: {
    capitalExpenditures: number;
    assetDisposals: number;
    equipmentPurchases: number;
    technologyInvestments: number;
    
    netCashFromInvesting: number;
  };
  
  // Financing Activities
  financingActivities: {
    debtProceeds: number;
    debtRepayments: number;
    ownerWithdrawals: number;
    ownerContributions: number;
    
    netCashFromFinancing: number;
  };
  
  // Cash position
  cashFlow: {
    beginningCash: number;
    netCashChange: number;
    endingCash: number;
  };
  
  // Supporting calculations
  supportingData: {
    revenue: number;
    totalExpenses: number;
    grossMargin: number;
    operatingMargin: number;
    
    // Working capital metrics
    workingCapitalBalance: number;
    workingCapitalChange: number;
    
    // Asset metrics
    totalAssets: number;
    assetTurnover: number;
    
    // Cash conversion cycle
    cashConversionCycle: number;
  };
}

export interface CashFlowProjectionResult {
  scenario: ForecastScenario;
  assumptions: CashFlowScenarioAssumptions;
  monthlyProjections: MonthlyOperatingCashFlow[];
  
  // Summary metrics
  summary: {
    totalCashGenerated: number;
    averageMonthlyCashFlow: number;
    cashFlowVolatility: number;
    endingCashPosition: number;
    
    // Performance metrics
    operatingCashFlowMargin: number;
    cashReturnOnAssets: number;
    workingCapitalEfficiency: number;
    
    // Risk metrics
    monthsOfCashCushion: number;
    negativeCashFlowMonths: number;
    largestCashOutflow: number;
  };
}

export class CashFlowStatementService {
  private forecastEngine: ForecastEngine;
  private trendAnalyzer: TrendAnalyzer;
  private expenseCategorizer: ExpenseCategorizer;
  private serviceBusinessForecaster: ServiceBusinessForecaster;
  private workingCapitalModeler: WorkingCapitalModeler;
  private assetProjectionModeler: AssetProjectionModeler;

  constructor() {
    this.forecastEngine = new ForecastEngine();
    this.trendAnalyzer = new TrendAnalyzer();
    this.expenseCategorizer = new ExpenseCategorizer();
    this.serviceBusinessForecaster = new ServiceBusinessForecaster();
    this.workingCapitalModeler = new WorkingCapitalModeler();
    this.assetProjectionModeler = new AssetProjectionModeler();
  }

  /**
   * Generate comprehensive 3-scenario cash flow projections
   */
  async generateThreeScenarioCashFlowProjections(
    historicalData: ParsedProfitLoss,
    currentCashBalance: number,
    monthsToProject: number = 12
  ): Promise<CashFlowProjectionResult[]> {
    
    console.log('🔄 Building foundation for cash flow projections...');
    
    // Step 1: Analyze historical trends
    const revenueTrends = this.trendAnalyzer.analyzeRevenueTrends(historicalData);
    const expenseBreakdown = this.trendAnalyzer.analyzeExpenseStructure(historicalData);
    
    // Step 2: Categorize expenses with inflation modeling
    const categorizedExpenses = this.expenseCategorizer.categorizeExpenses(
      historicalData, 
      revenueTrends, 
      expenseBreakdown
    );
    
    // Step 3: Extract working capital and asset components
    const workingCapitalComponents = this.workingCapitalModeler.extractWorkingCapitalComponents(
      historicalData, 
      'service'
    );
    
    const assetCategories = this.assetProjectionModeler.extractAssetCategories(
      historicalData, 
      'service'
    );
    
    console.log('📊 Generating projections for all 3 scenarios...');
    
    // Step 4: Generate projections for each scenario
    const scenarios: ForecastScenario[] = ['baseline', 'growth', 'downturn'];
    const results: CashFlowProjectionResult[] = [];
    
    for (const scenario of scenarios) {
      console.log(`🎯 Processing ${scenario} scenario...`);
      
      // Create scenario-specific assumptions
      const assumptions = this.createScenarioAssumptions(
        scenario,
        revenueTrends,
        workingCapitalComponents,
        assetCategories,
        historicalData
      );
      
      // Generate comprehensive cash flow projection
      const cashFlowProjection = await this.generateScenarioCashFlow(
        historicalData,
        assumptions,
        workingCapitalComponents,
        assetCategories,
        currentCashBalance,
        monthsToProject
      );
      
      results.push({
        scenario,
        assumptions,
        monthlyProjections: cashFlowProjection.monthlyProjections,
        summary: this.calculateProjectionSummary(cashFlowProjection.monthlyProjections)
      });
    }
    
    console.log('✅ All cash flow projections generated successfully');
    return results;
  }

  /**
   * Generate cash flow projection for a specific scenario
   */
  private async generateScenarioCashFlow(
    historicalData: ParsedProfitLoss,
    assumptions: CashFlowScenarioAssumptions,
    workingCapitalComponents: WorkingCapitalComponents,
    assetCategories: AssetCategory[],
    startingCash: number,
    monthsToProject: number
  ): Promise<{ monthlyProjections: MonthlyOperatingCashFlow[] }> {
    
    // Generate P&L projections using ForecastEngine
    const pnlForecasts = this.forecastEngine.generateEnhancedThreeScenarioForecast(
      historicalData,
      this.trendAnalyzer.analyzeRevenueTrends(historicalData),
      this.expenseCategorizer.categorizeExpenses(
        historicalData,
        this.trendAnalyzer.analyzeRevenueTrends(historicalData),
        this.trendAnalyzer.analyzeExpenseStructure(historicalData)
      ),
      monthsToProject
    );
    
    const scenarioForecast = pnlForecasts.find(f => f.scenario === assumptions.scenario);
    if (!scenarioForecast) {
      throw new Error(`No forecast found for scenario: ${assumptions.scenario}`);
    }
    
    // Generate working capital projections
    const workingCapitalProjections = this.workingCapitalModeler.generateWorkingCapitalProjections(
      workingCapitalComponents,
      assumptions.workingCapitalAssumptions,
      scenarioForecast.projections,
      monthsToProject
    );
    
    // Generate asset and capex projections
    const assetProjections = this.assetProjectionModeler.generateAssetProjections(
      assetCategories,
      assumptions.capexAssumptions,
      scenarioForecast.projections,
      monthsToProject
    );
    
    // Combine into comprehensive cash flow statements
    const monthlyProjections: MonthlyOperatingCashFlow[] = [];
    let currentCash = startingCash;
    
    for (let i = 0; i < monthsToProject; i++) {
      const pnlData = scenarioForecast.projections[i];
      const wcData = workingCapitalProjections[i];
      const assetData = assetProjections[i];
      
      if (!pnlData || !wcData || !assetData) continue;
      
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      
      // Calculate operating cash flow
      const operatingActivities = {
        netIncome: pnlData.netIncome,
        depreciation: assetData.monthlyDepreciation,
        amortization: 0, // Minimal for service business
        
        // Working capital changes (negative means cash outflow)
        accountsReceivableChange: -wcData.workingCapitalChange * 0.6, // Estimate AR portion
        inventoryChange: -wcData.workingCapitalChange * 0.1, // Minimal inventory
        accountsPayableChange: wcData.workingCapitalChange * 0.3, // AP helps cash flow
        
        prepaidExpensesChange: 0,
        accruedLiabilitiesChange: 0,
        
        netCashFromOperations: 0 // Will calculate below
      };
      
      operatingActivities.netCashFromOperations = 
        operatingActivities.netIncome +
        operatingActivities.depreciation +
        operatingActivities.amortization +
        operatingActivities.accountsReceivableChange +
        operatingActivities.inventoryChange +
        operatingActivities.accountsPayableChange +
        operatingActivities.prepaidExpensesChange +
        operatingActivities.accruedLiabilitiesChange;
      
      // Calculate investing activities
      const investingActivities = {
        capitalExpenditures: -assetData.assetAdditions, // Negative because it's cash outflow
        assetDisposals: assetData.disposalCashInflow,
        equipmentPurchases: -assetData.assetAdditions * 0.5,
        technologyInvestments: -assetData.assetAdditions * 0.1,
        
        netCashFromInvesting: assetData.netCapexCashFlow
      };
      
      // Calculate financing activities (simplified for service business)
      const monthlyRevenue = pnlData.revenue;
      const financingActivities = {
        debtProceeds: 0,
        debtRepayments: monthlyRevenue * -0.005, // Assume 0.5% of revenue in debt service
        ownerWithdrawals: Math.max(0, pnlData.netIncome * -0.3), // 30% of profits withdrawn
        ownerContributions: 0,
        
        netCashFromFinancing: 0 // Will calculate below
      };
      
      financingActivities.netCashFromFinancing = 
        financingActivities.debtProceeds +
        financingActivities.debtRepayments +
        financingActivities.ownerWithdrawals +
        financingActivities.ownerContributions;
      
      // Calculate total cash flow
      const netCashChange = 
        operatingActivities.netCashFromOperations +
        investingActivities.netCashFromInvesting +
        financingActivities.netCashFromFinancing;
      
      const endingCash = currentCash + netCashChange;
      
      monthlyProjections.push({
        month: pnlData.month,
        date: forecastDate,
        scenario: assumptions.scenario,
        
        operatingActivities,
        investingActivities,
        financingActivities,
        
        cashFlow: {
          beginningCash: currentCash,
          netCashChange,
          endingCash
        },
        
        supportingData: {
          revenue: pnlData.revenue,
          totalExpenses: pnlData.totalExpenses,
          grossMargin: ((pnlData.revenue - pnlData.totalExpenses) / pnlData.revenue) * 100,
          operatingMargin: (pnlData.netIncome / pnlData.revenue) * 100,
          
          workingCapitalBalance: wcData.endingAR + wcData.endingInventory - wcData.endingAP,
          workingCapitalChange: wcData.workingCapitalChange,
          
          totalAssets: assetData.endingNetAssets + wcData.endingAR + wcData.endingInventory,
          assetTurnover: assetData.assetTurnover,
          
          cashConversionCycle: wcData.cashConversionCycle
        }
      });
      
      currentCash = endingCash;
    }
    
    return { monthlyProjections };
  }

  /**
   * Create scenario-specific assumptions
   */
  private createScenarioAssumptions(
    scenario: ForecastScenario,
    revenueTrends: TrendAnalysis,
    workingCapitalComponents: WorkingCapitalComponents,
    assetCategories: AssetCategory[],
    historicalData: ParsedProfitLoss
  ): CashFlowScenarioAssumptions {
    
    const averageMonthlyRevenue = historicalData.revenue.monthlyTotals.reduce(
      (sum, m) => sum + m.value, 0
    ) / historicalData.revenue.monthlyTotals.length;
    
    // Base scenario multipliers
    const scenarioMultipliers = {
      baseline: { growth: 1.0, expense: 1.0, confidence: 0.7 },
      growth: { growth: 1.5, expense: 1.1, confidence: 0.9 },
      downturn: { growth: 0.6, expense: 0.9, confidence: 0.4 }
    };
    
    const multiplier = scenarioMultipliers[scenario];
    
    return {
      scenario,
      
      revenueGrowthAssumptions: {
        monthlyGrowthRate: revenueTrends.monthlyGrowthRate * multiplier.growth,
        seasonalAdjustments: {}, // Will enhance with seasonal patterns later
        customerGrowthRate: multiplier.growth * 0.8, // Slightly lower than revenue growth
        avgRevenuePerCustomer: averageMonthlyRevenue * 0.1 // Estimate
      },
      
      expenseAssumptions: {
        variableCostRatio: 0.4 * multiplier.expense,
        fixedCostInflation: 3.5 * multiplier.expense,
        categoryInflationRates: {
          'Labor': 4.5 * multiplier.expense,
          'Rent': 3.8 * multiplier.expense,
          'Materials': 3.5 * multiplier.expense,
          'Utilities': 4.2 * multiplier.expense,
          'Equipment': 2.8 * multiplier.expense
        }
      },
      
      workingCapitalAssumptions: this.workingCapitalModeler.createWorkingCapitalAssumptions(
        workingCapitalComponents, 
        scenario
      ),
      
      capexAssumptions: this.assetProjectionModeler.createCapexAssumptions(
        assetCategories, 
        scenario, 
        averageMonthlyRevenue
      ),
      
      economicConditions: {
        marketConditions: scenario === 'growth' ? 'expanding' : 
                         scenario === 'downturn' ? 'contracting' : 'stable',
        confidenceLevel: multiplier.confidence > 0.8 ? 'high' : 
                        multiplier.confidence > 0.6 ? 'medium' : 'low',
        industryGrowthRate: 0.05 * multiplier.growth // 5% base industry growth
      }
    };
  }

  /**
   * Calculate summary metrics for cash flow projections
   */
  private calculateProjectionSummary(projections: MonthlyOperatingCashFlow[]) {
    if (projections.length === 0) {
      throw new Error('No projections to summarize');
    }
    
    const totalCashGenerated = projections.reduce((sum, p) => sum + p.cashFlow.netCashChange, 0);
    const averageMonthlyCashFlow = totalCashGenerated / projections.length;
    const endingCashPosition = projections[projections.length - 1].cashFlow.endingCash;
    
    // Calculate volatility (standard deviation of monthly cash flows)
    const cashFlows = projections.map(p => p.cashFlow.netCashChange);
    const variance = cashFlows.reduce((sum, cf) => sum + Math.pow(cf - averageMonthlyCashFlow, 2), 0) / cashFlows.length;
    const cashFlowVolatility = Math.sqrt(variance);
    
    // Calculate performance metrics
    const totalRevenue = projections.reduce((sum, p) => sum + p.supportingData.revenue, 0);
    const totalOperatingCashFlow = projections.reduce((sum, p) => sum + p.operatingActivities.netCashFromOperations, 0);
    const operatingCashFlowMargin = totalRevenue > 0 ? (totalOperatingCashFlow / totalRevenue) * 100 : 0;
    
    const averageAssets = projections.reduce((sum, p) => sum + p.supportingData.totalAssets, 0) / projections.length;
    const cashReturnOnAssets = averageAssets > 0 ? (totalOperatingCashFlow / averageAssets) * 100 : 0;
    
    const workingCapitalChanges = projections.map(p => Math.abs(p.supportingData.workingCapitalChange));
    const workingCapitalEfficiency = workingCapitalChanges.reduce((sum, wc) => sum + wc, 0) / projections.length;
    
    // Calculate risk metrics
    const negativeCashFlowMonths = projections.filter(p => p.cashFlow.netCashChange < 0).length;
    const largestCashOutflow = Math.min(...cashFlows);
    const monthsOfCashCushion = averageMonthlyCashFlow !== 0 ? endingCashPosition / Math.abs(averageMonthlyCashFlow) : 0;
    
    return {
      totalCashGenerated: Math.round(totalCashGenerated),
      averageMonthlyCashFlow: Math.round(averageMonthlyCashFlow),
      cashFlowVolatility: Math.round(cashFlowVolatility),
      endingCashPosition: Math.round(endingCashPosition),
      
      operatingCashFlowMargin: Math.round(operatingCashFlowMargin * 100) / 100,
      cashReturnOnAssets: Math.round(cashReturnOnAssets * 100) / 100,
      workingCapitalEfficiency: Math.round(workingCapitalEfficiency),
      
      monthsOfCashCushion: Math.round(monthsOfCashCushion * 10) / 10,
      negativeCashFlowMonths,
      largestCashOutflow: Math.round(largestCashOutflow)
    };
  }
}