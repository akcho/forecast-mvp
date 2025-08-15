/**
 * AssetProjectionModeler - Models fixed asset projections including equipment, depreciation
 * Handles capital expenditures, asset additions, and depreciation schedules
 */

import { ParsedProfitLoss } from '../types/financialModels';
import { ForecastedMonth } from './ForecastEngine';

export interface AssetCategory {
  categoryName: string;
  currentBookValue: number;
  currentAccumulatedDepreciation: number;
  originalCost: number;
  usefulLife: number;              // Years
  depreciationMethod: 'straight-line' | 'double-declining' | 'units-of-production';
  annualDepreciationRate: number;  // %
  
  // Asset characteristics
  assetType: 'equipment' | 'vehicles' | 'technology' | 'buildings' | 'improvements';
  acquisitionPattern: 'regular' | 'seasonal' | 'growth-driven' | 'replacement-only';
  maintenanceIntensity: 'low' | 'medium' | 'high';
}

export interface CapitalExpenditureAssumptions {
  // Growth-driven investments
  revenueGrowthCapexRatio: number;     // % of incremental revenue requiring capex
  capacityExpansionThreshold: number;   // Revenue growth % triggering major capex
  
  // Replacement cycles
  equipmentReplacementCycle: number;    // Years
  vehicleReplacementCycle: number;      // Years
  technologyReplacementCycle: number;   // Years
  
  // Investment timing
  seasonalCapexTiming: {
    [month: string]: number;           // % of annual capex by month
  };
  
  // Economic scenario adjustments
  capexStrategy: 'aggressive' | 'moderate' | 'conservative';
  maintenanceVsReplacement: number;     // % favoring maintenance over replacement
  
  // Financing approach
  cashVsFinanced: number;              // % of capex paid in cash vs financed
  averageAssetLife: number;            // Years for depreciation planning
}

export interface AssetProjection {
  month: string;
  date: Date;
  
  // Beginning balances
  beginningGrossAssets: number;
  beginningAccumulatedDepreciation: number;
  beginningNetAssets: number;
  
  // Monthly activity
  assetAdditions: number;              // New asset purchases
  assetDisposals: number;              // Asset sales/retirements
  monthlyDepreciation: number;         // Depreciation expense
  
  // Asset breakdown by category
  assetsByCategory: {
    [categoryName: string]: {
      grossValue: number;
      accumulatedDepreciation: number;
      netValue: number;
      monthlyDepreciation: number;
    };
  };
  
  // Ending balances
  endingGrossAssets: number;
  endingAccumulatedDepreciation: number;
  endingNetAssets: number;
  
  // Cash flow impacts
  capexCashOutflow: number;            // Cash spent on new assets
  disposalCashInflow: number;          // Cash from asset sales
  netCapexCashFlow: number;            // Net cash impact
  
  // Asset efficiency metrics
  assetTurnover: number;               // Revenue / Average assets
  depreciationAsPercentOfRevenue: number;
  assetIntensity: number;              // Assets / Revenue ratio
}

export class AssetProjectionModeler {
  
  /**
   * Extract asset information from expense patterns in P&L
   * Note: P&L includes depreciation expense, we estimate asset base from this
   */
  extractAssetCategories(
    historicalData: ParsedProfitLoss,
    businessType: 'service' | 'product' = 'service'
  ): AssetCategory[] {
    
    const averageMonthlyRevenue = historicalData.revenue.monthlyTotals.reduce((sum, m) => sum + m.value, 0) / historicalData.revenue.monthlyTotals.length;
    
    // Estimate depreciation expense from expense lines
    const estimatedDepreciationExpense = this.estimateDepreciationFromExpenses(historicalData);
    
    // Create asset categories based on business type
    const assetCategories: AssetCategory[] = [];
    
    if (businessType === 'service') {
      // Landscaping/service business typical assets
      
      // Equipment (mowers, tools, etc.)
      assetCategories.push(this.createAssetCategory(
        'Equipment',
        estimatedDepreciationExpense * 0.5, // 50% of depreciation from equipment
        7, // 7-year useful life
        'straight-line',
        'equipment',
        'growth-driven'
      ));
      
      // Vehicles (trucks, trailers)
      assetCategories.push(this.createAssetCategory(
        'Vehicles',
        estimatedDepreciationExpense * 0.3, // 30% of depreciation from vehicles
        5, // 5-year useful life
        'double-declining',
        'vehicles',
        'replacement-only'
      ));
      
      // Technology (software, computers)
      assetCategories.push(this.createAssetCategory(
        'Technology',
        estimatedDepreciationExpense * 0.1, // 10% of depreciation from technology
        3, // 3-year useful life
        'straight-line',
        'technology',
        'regular'
      ));
      
      // Buildings/Improvements (storage, office)
      assetCategories.push(this.createAssetCategory(
        'Buildings & Improvements',
        estimatedDepreciationExpense * 0.1, // 10% of depreciation from buildings
        15, // 15-year useful life
        'straight-line',
        'improvements',
        'seasonal'
      ));
    }
    
    return assetCategories;
  }
  
  /**
   * Create capital expenditure assumptions based on business scenario
   */
  createCapexAssumptions(
    assetCategories: AssetCategory[],
    scenario: 'baseline' | 'growth' | 'downturn',
    averageMonthlyRevenue: number
  ): CapitalExpenditureAssumptions {
    
    const scenarioMultipliers = {
      baseline: { capexRatio: 1.0, replacement: 1.0, timing: 'moderate' as const },
      growth: { capexRatio: 1.5, replacement: 1.2, timing: 'aggressive' as const },
      downturn: { capexRatio: 0.4, replacement: 0.7, timing: 'conservative' as const }
    };
    
    const multiplier = scenarioMultipliers[scenario];
    
    // Base assumptions for service business
    const baseRevenueGrowthCapexRatio = 8; // 8% of incremental revenue requires capex
    const revenueGrowthCapexRatio = baseRevenueGrowthCapexRatio * multiplier.capexRatio;
    
    // Seasonal capex timing (landscaping businesses invest in spring)
    const seasonalCapexTiming = {
      'Jan': 5, 'Feb': 8, 'Mar': 15, 'Apr': 20, 'May': 15, 'Jun': 10,
      'Jul': 8, 'Aug': 5, 'Sep': 5, 'Oct': 3, 'Nov': 3, 'Dec': 3
    };
    
    return {
      revenueGrowthCapexRatio,
      capacityExpansionThreshold: scenario === 'growth' ? 25 : scenario === 'downturn' ? 10 : 20,
      equipmentReplacementCycle: 7 * multiplier.replacement,
      vehicleReplacementCycle: 5 * multiplier.replacement,
      technologyReplacementCycle: 3 * multiplier.replacement,
      seasonalCapexTiming,
      capexStrategy: multiplier.timing,
      maintenanceVsReplacement: scenario === 'downturn' ? 70 : scenario === 'growth' ? 30 : 50,
      cashVsFinanced: scenario === 'growth' ? 60 : 80, // More financing in growth scenario
      averageAssetLife: 6
    };
  }
  
  /**
   * Generate asset and depreciation projections
   */
  generateAssetProjections(
    assetCategories: AssetCategory[],
    assumptions: CapitalExpenditureAssumptions,
    revenueProjections: ForecastedMonth[],
    monthsToProject: number = 12
  ): AssetProjection[] {
    
    const projections: AssetProjection[] = [];
    
    // Initialize tracking variables
    let currentAssetsByCategory = assetCategories.reduce((acc, category) => {
      acc[category.categoryName] = {
        grossValue: category.originalCost,
        accumulatedDepreciation: category.currentAccumulatedDepreciation,
        netValue: category.currentBookValue
      };
      return acc;
    }, {} as any);
    
    for (let i = 0; i < monthsToProject; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      const monthName = forecastDate.toLocaleDateString('en-US', { month: 'short' });
      
      // Get revenue projection for this month
      const revenueProjection = revenueProjections[i];
      const monthlyRevenue = revenueProjection?.revenue || 0;
      
      // Calculate beginning balances
      const beginningGrossAssets = Object.values(currentAssetsByCategory).reduce((sum: number, cat: any) => sum + cat.grossValue, 0);
      const beginningAccumulatedDepreciation = Object.values(currentAssetsByCategory).reduce((sum: number, cat: any) => sum + cat.accumulatedDepreciation, 0);
      const beginningNetAssets = beginningGrossAssets - beginningAccumulatedDepreciation;
      
      // Calculate new asset additions
      const seasonalCapexFactor = (assumptions.seasonalCapexTiming[monthName] || 8) / 100;
      
      // Growth-driven capex
      const previousRevenue = i > 0 ? (revenueProjections[i-1]?.revenue || monthlyRevenue) : monthlyRevenue;
      const revenueGrowth = monthlyRevenue - previousRevenue;
      const growthDrivenCapex = Math.max(0, revenueGrowth * (assumptions.revenueGrowthCapexRatio / 100));
      
      // Seasonal/regular capex
      const annualBaseCapex = beginningNetAssets * 0.15; // 15% of asset base annually
      const monthlyBaseCapex = (annualBaseCapex / 12) * seasonalCapexFactor * 12; // Adjust for seasonality
      
      const totalAssetAdditions = growthDrivenCapex + monthlyBaseCapex;
      
      // Calculate monthly depreciation by category
      const monthlyDepreciationByCategory = {} as any;
      let totalMonthlyDepreciation = 0;
      
      Object.entries(currentAssetsByCategory).forEach(([categoryName, categoryData]: [string, any]) => {
        const category = assetCategories.find(c => c.categoryName === categoryName);
        if (category) {
          const monthlyDepreciation = categoryData.grossValue / (category.usefulLife * 12);
          monthlyDepreciationByCategory[categoryName] = monthlyDepreciation;
          totalMonthlyDepreciation += monthlyDepreciation;
        }
      });
      
      // Asset disposals (simplified - mainly replacements)
      const assetDisposals = totalAssetAdditions * 0.1; // 10% of additions represent replacements
      
      // Update asset balances
      const updatedAssetsByCategory = {} as any;
      Object.entries(currentAssetsByCategory).forEach(([categoryName, categoryData]: [string, any]) => {
        const categoryAdditions = totalAssetAdditions * this.getCategoryAllocationPercentage(categoryName);
        const categoryDisposals = assetDisposals * this.getCategoryAllocationPercentage(categoryName);
        
        updatedAssetsByCategory[categoryName] = {
          grossValue: categoryData.grossValue + categoryAdditions - categoryDisposals,
          accumulatedDepreciation: categoryData.accumulatedDepreciation + monthlyDepreciationByCategory[categoryName],
          netValue: (categoryData.grossValue + categoryAdditions - categoryDisposals) - (categoryData.accumulatedDepreciation + monthlyDepreciationByCategory[categoryName]),
          monthlyDepreciation: monthlyDepreciationByCategory[categoryName]
        };
      });
      
      // Calculate ending balances
      const endingGrossAssets = Object.values(updatedAssetsByCategory).reduce((sum: number, cat: any) => sum + cat.grossValue, 0);
      const endingAccumulatedDepreciation = Object.values(updatedAssetsByCategory).reduce((sum: number, cat: any) => sum + cat.accumulatedDepreciation, 0);
      const endingNetAssets = endingGrossAssets - endingAccumulatedDepreciation;
      
      // Cash flow impacts
      const capexCashOutflow = totalAssetAdditions * (assumptions.cashVsFinanced / 100);
      const disposalCashInflow = assetDisposals * 0.2; // Assume 20% of book value on disposal
      const netCapexCashFlow = disposalCashInflow - capexCashOutflow;
      
      // Calculate efficiency metrics
      const assetTurnover = monthlyRevenue > 0 ? (monthlyRevenue * 12) / ((beginningNetAssets + endingNetAssets) / 2) : 0;
      const depreciationAsPercentOfRevenue = monthlyRevenue > 0 ? (totalMonthlyDepreciation / monthlyRevenue) * 100 : 0;
      const assetIntensity = monthlyRevenue > 0 ? endingNetAssets / (monthlyRevenue * 12) : 0;
      
      projections.push({
        month: monthName,
        date: forecastDate,
        beginningGrossAssets,
        beginningAccumulatedDepreciation,
        beginningNetAssets,
        assetAdditions: totalAssetAdditions,
        assetDisposals,
        monthlyDepreciation: totalMonthlyDepreciation,
        assetsByCategory: updatedAssetsByCategory,
        endingGrossAssets,
        endingAccumulatedDepreciation,
        endingNetAssets,
        capexCashOutflow,
        disposalCashInflow,
        netCapexCashFlow,
        assetTurnover,
        depreciationAsPercentOfRevenue,
        assetIntensity
      });
      
      // Update for next iteration
      currentAssetsByCategory = updatedAssetsByCategory;
    }
    
    return projections;
  }
  
  // Helper methods
  
  private estimateDepreciationFromExpenses(historicalData: ParsedProfitLoss): number {
    // Look for depreciation in expense lines
    const depreciationLines = historicalData.expenses.lines.filter(line => 
      line.accountName.toLowerCase().includes('depreciation') ||
      line.accountName.toLowerCase().includes('amortization')
    );
    
    if (depreciationLines.length > 0) {
      return depreciationLines.reduce((sum, line) => sum + Math.abs(line.total), 0) / 12; // Monthly average
    }
    
    // If no explicit depreciation found, estimate based on business size
    const averageMonthlyRevenue = historicalData.revenue.monthlyTotals.reduce((sum, m) => sum + m.value, 0) / historicalData.revenue.monthlyTotals.length;
    return averageMonthlyRevenue * 0.02; // 2% of revenue as depreciation estimate
  }
  
  private createAssetCategory(
    categoryName: string,
    monthlyDepreciation: number,
    usefulLife: number,
    depreciationMethod: 'straight-line' | 'double-declining' | 'units-of-production',
    assetType: 'equipment' | 'vehicles' | 'technology' | 'buildings' | 'improvements',
    acquisitionPattern: 'regular' | 'seasonal' | 'growth-driven' | 'replacement-only'
  ): AssetCategory {
    
    // Estimate original cost from depreciation
    const annualDepreciation = monthlyDepreciation * 12;
    const originalCost = annualDepreciation * usefulLife;
    
    // Estimate current accumulated depreciation (assume assets are ~40% depreciated on average)
    const currentAccumulatedDepreciation = originalCost * 0.4;
    const currentBookValue = originalCost - currentAccumulatedDepreciation;
    
    return {
      categoryName,
      currentBookValue,
      currentAccumulatedDepreciation,
      originalCost,
      usefulLife,
      depreciationMethod,
      annualDepreciationRate: (1 / usefulLife) * 100,
      assetType,
      acquisitionPattern,
      maintenanceIntensity: assetType === 'equipment' ? 'high' : assetType === 'vehicles' ? 'medium' : 'low'
    };
  }
  
  private getCategoryAllocationPercentage(categoryName: string): number {
    // Allocation percentages for new capex by category
    const allocations: { [key: string]: number } = {
      'Equipment': 0.50,
      'Vehicles': 0.30,
      'Technology': 0.10,
      'Buildings & Improvements': 0.10
    };
    
    return allocations[categoryName] || 0.25; // Default 25% if not found
  }
}