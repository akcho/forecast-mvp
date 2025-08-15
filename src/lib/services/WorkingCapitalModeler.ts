/**
 * WorkingCapitalModeler - Models working capital components for cash flow forecasting
 * Handles Accounts Receivable, Accounts Payable, and Inventory dynamics
 */

import { ParsedProfitLoss } from '../types/financialModels';
import { ForecastedMonth } from './ForecastEngine';

export interface WorkingCapitalComponents {
  // Accounts Receivable
  accountsReceivable: {
    currentBalance: number;
    daysOutstanding: number;         // Average collection period
    collectionPattern: {             // % collected each month after sale
      month1: number;                // % collected in month of sale
      month2: number;                // % collected in 2nd month
      month3: number;                // % collected in 3rd month
      badDebt: number;               // % never collected
    };
    seasonalFactors: {
      [month: string]: number;       // Collection efficiency by month
    };
  };
  
  // Accounts Payable
  accountsPayable: {
    currentBalance: number;
    daysOutstanding: number;         // Average payment period
    paymentPattern: {                // % paid each month after expense
      month1: number;                // % paid in month of expense
      month2: number;                // % paid in 2nd month
      month3: number;                // % paid in 3rd month
    };
    supplierTerms: {
      averagePaymentTerms: number;   // Days (30, 60, 90)
      earlyPaymentDiscount: number;  // % discount for early payment
      latePaymentPenalty: number;    // % penalty for late payment
    };
  };
  
  // Inventory (for service businesses, minimal)
  inventory: {
    currentBalance: number;
    turnoverRatio: number;           // Times per year
    daysOnHand: number;              // Average inventory days
    seasonalBuildUp: {
      [month: string]: number;       // Inventory multiplier by month
    };
  };
  
  // Working capital efficiency metrics
  workingCapitalMetrics: {
    cashConversionCycle: number;     // Days (DSO + DIO - DPO)
    workingCapitalAsPercentOfRevenue: number;
    workingCapitalTurnover: number;
  };
}

export interface WorkingCapitalAssumptions {
  // Collection improvements/deterioration
  collectionEfficiencyChange: number;    // Monthly % improvement in collections
  badDebtRateChange: number;             // Change in bad debt %
  
  // Payment timing optimization
  paymentTimingStrategy: 'aggressive' | 'balanced' | 'conservative';
  supplierNegotiationSuccess: number;    // % improvement in payment terms
  
  // Seasonal working capital patterns
  seasonalWorkingCapitalNeed: number;    // Peak working capital as % of average
  
  // Growth impact on working capital
  workingCapitalScalingFactor: number;   // How WC scales with revenue growth
  
  // Economic scenario adjustments
  economicConditions: {
    customerPaymentBehavior: 'improving' | 'stable' | 'deteriorating';
    supplierPaymentFlexibility: 'high' | 'medium' | 'low';
    cashFlowPriority: 'growth' | 'stability' | 'cash_generation';
  };
}

export interface WorkingCapitalProjection {
  month: string;
  date: Date;
  
  // Beginning balances
  beginningAR: number;
  beginningAP: number;
  beginningInventory: number;
  
  // Monthly activity
  newSales: number;
  cashCollected: number;
  newExpenses: number;
  cashPaid: number;
  inventoryPurchases: number;
  inventoryUsed: number;
  
  // Ending balances
  endingAR: number;
  endingAP: number;
  endingInventory: number;
  
  // Net working capital impact
  workingCapitalChange: number;        // Increase/decrease in working capital
  netCashFlowFromWorkingCapital: number; // Cash impact
  
  // Efficiency metrics
  daysOutstandingAR: number;
  daysOutstandingAP: number;
  cashConversionCycle: number;
  
  // Working capital as % of revenue
  workingCapitalRatio: number;
}

export class WorkingCapitalModeler {
  
  /**
   * Extract working capital components from QuickBooks data
   * Note: QB P&L doesn't include balance sheet items, so we'll estimate
   */
  extractWorkingCapitalComponents(
    historicalData: ParsedProfitLoss,
    businessType: 'service' | 'product' = 'service'
  ): WorkingCapitalComponents {
    
    const averageMonthlyRevenue = historicalData.revenue.monthlyTotals.reduce((sum, m) => sum + m.value, 0) / historicalData.revenue.monthlyTotals.length;
    const averageMonthlyExpenses = historicalData.expenses.monthlyTotals.reduce((sum, m) => sum + m.value, 0) / historicalData.expenses.monthlyTotals.length;
    
    // Estimate working capital based on industry standards for service businesses
    const estimatedAR = this.estimateAccountsReceivable(averageMonthlyRevenue, businessType);
    const estimatedAP = this.estimateAccountsPayable(averageMonthlyExpenses, businessType);
    const estimatedInventory = this.estimateInventory(averageMonthlyRevenue, businessType);
    
    // Calculate collection patterns based on service business norms
    const collectionPattern = this.determineCollectionPattern(businessType);
    const paymentPattern = this.determinePaymentPattern(businessType);
    
    // Seasonal factors (will be enhanced with actual historical data)
    const seasonalFactors = this.estimateSeasonalFactors(historicalData.revenue.monthlyTotals);
    
    return {
      accountsReceivable: {
        currentBalance: estimatedAR.balance,
        daysOutstanding: estimatedAR.daysOutstanding,
        collectionPattern,
        seasonalFactors
      },
      accountsPayable: {
        currentBalance: estimatedAP.balance,
        daysOutstanding: estimatedAP.daysOutstanding,
        paymentPattern,
        supplierTerms: {
          averagePaymentTerms: 30, // Standard 30-day terms
          earlyPaymentDiscount: 2.0, // 2% discount for early payment
          latePaymentPenalty: 1.5 // 1.5% monthly late fee
        }
      },
      inventory: {
        currentBalance: estimatedInventory.balance,
        turnoverRatio: estimatedInventory.turnoverRatio,
        daysOnHand: estimatedInventory.daysOnHand,
        seasonalBuildUp: this.estimateInventorySeasonality(businessType)
      },
      workingCapitalMetrics: {
        cashConversionCycle: estimatedAR.daysOutstanding + estimatedInventory.daysOnHand - estimatedAP.daysOutstanding,
        workingCapitalAsPercentOfRevenue: ((estimatedAR.balance + estimatedInventory.balance - estimatedAP.balance) / (averageMonthlyRevenue * 12)) * 100,
        workingCapitalTurnover: (averageMonthlyRevenue * 12) / (estimatedAR.balance + estimatedInventory.balance - estimatedAP.balance)
      }
    };
  }
  
  /**
   * Create working capital assumptions for different scenarios
   */
  createWorkingCapitalAssumptions(
    _components: WorkingCapitalComponents,
    scenario: 'baseline' | 'growth' | 'downturn'
  ): WorkingCapitalAssumptions {
    
    const scenarioAdjustments = {
      baseline: {
        collectionEfficiency: 0,     // No change
        badDebtChange: 0,
        paymentStrategy: 'balanced' as const,
        supplierSuccess: 0,
        scalingFactor: 1.0
      },
      growth: {
        collectionEfficiency: 0.5,   // 0.5% monthly improvement
        badDebtChange: -0.1,         // Slight reduction in bad debt
        paymentStrategy: 'aggressive' as const,
        supplierSuccess: 10,         // 10% improvement in terms
        scalingFactor: 1.1           // Working capital grows 10% faster than revenue
      },
      downturn: {
        collectionEfficiency: -0.3,  // Collections deteriorate
        badDebtChange: 0.5,          // Bad debt increases
        paymentStrategy: 'conservative' as const,
        supplierSuccess: -5,         // Worse payment terms
        scalingFactor: 0.9           // Working capital shrinks with revenue
      }
    };
    
    const adjustments = scenarioAdjustments[scenario];
    
    // Economic conditions based on scenario
    const economicConditions = {
      baseline: {
        customerPaymentBehavior: 'stable' as const,
        supplierPaymentFlexibility: 'medium' as const,
        cashFlowPriority: 'stability' as const
      },
      growth: {
        customerPaymentBehavior: 'improving' as const,
        supplierPaymentFlexibility: 'high' as const,
        cashFlowPriority: 'growth' as const
      },
      downturn: {
        customerPaymentBehavior: 'deteriorating' as const,
        supplierPaymentFlexibility: 'low' as const,
        cashFlowPriority: 'cash_generation' as const
      }
    };
    
    return {
      collectionEfficiencyChange: adjustments.collectionEfficiency,
      badDebtRateChange: adjustments.badDebtChange,
      paymentTimingStrategy: adjustments.paymentStrategy,
      supplierNegotiationSuccess: adjustments.supplierSuccess,
      seasonalWorkingCapitalNeed: 1.2, // 20% seasonal increase
      workingCapitalScalingFactor: adjustments.scalingFactor,
      economicConditions: economicConditions[scenario]
    };
  }
  
  /**
   * Generate working capital projections for forecast period
   */
  generateWorkingCapitalProjections(
    components: WorkingCapitalComponents,
    assumptions: WorkingCapitalAssumptions,
    revenueProjections: ForecastedMonth[],
    monthsToProject: number = 12
  ): WorkingCapitalProjection[] {
    
    const projections: WorkingCapitalProjection[] = [];
    
    // Starting balances
    let currentAR = components.accountsReceivable.currentBalance;
    let currentAP = components.accountsPayable.currentBalance;
    let currentInventory = components.inventory.currentBalance;
    
    // Collection and payment efficiency tracking
    let collectionEfficiency = 1.0;
    let badDebtRate = components.accountsReceivable.collectionPattern.badDebt;
    
    for (let i = 0; i < monthsToProject; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      const monthName = forecastDate.toLocaleDateString('en-US', { month: 'short' });
      
      // Get revenue and expense projections for this month
      const revenueProjection = revenueProjections[i];
      const newSales = revenueProjection?.revenue || 0;
      const newExpenses = revenueProjection?.totalExpenses || 0;
      
      // Apply efficiency changes
      collectionEfficiency = Math.min(1.1, collectionEfficiency + (assumptions.collectionEfficiencyChange / 100));
      badDebtRate = Math.max(0, badDebtRate + (assumptions.badDebtRateChange / 100));
      
      // Calculate cash collections (simplified 3-month pattern)
      const collectionPattern = components.accountsReceivable.collectionPattern;
      const seasonalFactor = components.accountsReceivable.seasonalFactors[monthName] || 1.0;
      
      // Collections from current month sales
      const currentMonthCollections = newSales * (collectionPattern.month1 / 100) * collectionEfficiency * seasonalFactor;
      
      // Collections from previous months (simplified - would need more complex tracking)
      const priorMonthCollections = currentAR * 0.4 * collectionEfficiency * seasonalFactor; // Estimate
      
      const totalCashCollected = currentMonthCollections + priorMonthCollections;
      
      // Calculate cash payments
      const paymentPattern = components.accountsPayable.paymentPattern;
      const currentMonthPayments = newExpenses * (paymentPattern.month1 / 100);
      const priorMonthPayments = currentAP * 0.5; // Simplified estimate
      
      const totalCashPaid = currentMonthPayments + priorMonthPayments;
      
      // Inventory changes (minimal for service businesses)
      const inventoryPurchases = newExpenses * 0.1; // 10% of expenses might be inventory-related
      const inventoryUsed = inventoryPurchases * 0.9; // Most used immediately
      
      // Calculate ending balances
      const newARFromSales = newSales * (1 - collectionPattern.month1 / 100);
      const endingAR = currentAR + newARFromSales - totalCashCollected;
      
      const newAPFromExpenses = newExpenses * (1 - paymentPattern.month1 / 100);
      const endingAP = currentAP + newAPFromExpenses - totalCashPaid;
      
      const endingInventory = currentInventory + inventoryPurchases - inventoryUsed;
      
      // Working capital changes
      const beginningWC = currentAR + currentInventory - currentAP;
      const endingWC = endingAR + endingInventory - endingAP;
      const workingCapitalChange = endingWC - beginningWC;
      
      // Net cash flow impact (increase in WC uses cash)
      const netCashFlowFromWorkingCapital = -workingCapitalChange;
      
      // Calculate efficiency metrics
      const daysOutstandingAR = (endingAR / (newSales || 1)) * 30;
      const daysOutstandingAP = (endingAP / (newExpenses || 1)) * 30;
      const cashConversionCycle = daysOutstandingAR + (endingInventory / (newExpenses || 1)) * 30 - daysOutstandingAP;
      
      projections.push({
        month: monthName,
        date: forecastDate,
        beginningAR: currentAR,
        beginningAP: currentAP,
        beginningInventory: currentInventory,
        newSales,
        cashCollected: totalCashCollected,
        newExpenses,
        cashPaid: totalCashPaid,
        inventoryPurchases,
        inventoryUsed,
        endingAR,
        endingAP,
        endingInventory,
        workingCapitalChange,
        netCashFlowFromWorkingCapital,
        daysOutstandingAR,
        daysOutstandingAP,
        cashConversionCycle,
        workingCapitalRatio: (endingWC / (newSales || 1)) * 100
      });
      
      // Update for next iteration
      currentAR = endingAR;
      currentAP = endingAP;
      currentInventory = endingInventory;
    }
    
    return projections;
  }
  
  // Helper methods for estimation
  
  private estimateAccountsReceivable(averageMonthlyRevenue: number, businessType: string) {
    // Service businesses typically have 30-45 day collection periods
    const daysOutstanding = businessType === 'service' ? 35 : 45;
    const balance = (averageMonthlyRevenue * daysOutstanding) / 30;
    
    return { balance, daysOutstanding };
  }
  
  private estimateAccountsPayable(averageMonthlyExpenses: number, businessType: string) {
    // Service businesses typically pay in 25-35 days
    const daysOutstanding = businessType === 'service' ? 30 : 40;
    const balance = (averageMonthlyExpenses * daysOutstanding) / 30;
    
    return { balance, daysOutstanding };
  }
  
  private estimateInventory(averageMonthlyRevenue: number, businessType: string) {
    if (businessType === 'service') {
      // Minimal inventory for service businesses
      return {
        balance: averageMonthlyRevenue * 0.05, // 5% of monthly revenue
        turnoverRatio: 24, // 24 times per year
        daysOnHand: 15 // 15 days of inventory
      };
    } else {
      return {
        balance: averageMonthlyRevenue * 0.25, // 25% of monthly revenue
        turnoverRatio: 6, // 6 times per year
        daysOnHand: 60 // 60 days of inventory
      };
    }
  }
  
  private determineCollectionPattern(businessType: string) {
    if (businessType === 'service') {
      return {
        month1: 70, // 70% collected in month of service
        month2: 25, // 25% in second month
        month3: 4,  // 4% in third month
        badDebt: 1  // 1% bad debt
      };
    } else {
      return {
        month1: 60, // 60% collected in month of sale
        month2: 30, // 30% in second month
        month3: 8,  // 8% in third month
        badDebt: 2  // 2% bad debt
      };
    }
  }
  
  private determinePaymentPattern(businessType: string) {
    return {
      month1: 50, // 50% paid in month of expense
      month2: 40, // 40% paid in second month
      month3: 10  // 10% paid in third month
    };
  }
  
  private estimateSeasonalFactors(_monthlyRevenue: any[]) {
    // Simple seasonal factor estimation
    const factors: { [month: string]: number } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    months.forEach(month => {
      factors[month] = 1.0; // Default to no seasonal adjustment
    });
    
    return factors;
  }
  
  private estimateInventorySeasonality(_businessType: string) {
    const factors: { [month: string]: number } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (_businessType === 'service') {
      // Minimal seasonal inventory needs for service businesses
      months.forEach(month => {
        factors[month] = 1.0;
      });
    } else {
      // Product businesses might build inventory before peak seasons
      months.forEach(month => {
        factors[month] = ['Mar', 'Apr', 'Oct', 'Nov'].includes(month) ? 1.3 : 1.0;
      });
    }
    
    return factors;
  }
}