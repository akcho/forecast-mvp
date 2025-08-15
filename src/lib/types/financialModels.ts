/**
 * Financial model types for structured data parsing and forecasting
 * Used by FinancialDataParser and Sprint 2 forecasting services
 */

// Core monthly data structure
export interface MonthlyValue {
  month: string;      // "May 2025", "Jun 2025", etc.
  value: number;
  date: Date;
}

// P&L line item with monthly breakdown  
export interface MonthlyFinancialLine {
  accountName: string;
  accountId?: string;
  monthlyValues: MonthlyValue[];
  total: number;
  level: number;      // Indentation level for hierarchy
  type: 'revenue' | 'expense' | 'summary';
}

// Parsed P&L structure ready for forecasting
export interface ParsedProfitLoss {
  period: {
    start: Date;
    end: Date;
    months: string[];  // ["May 2025", "Jun 2025", "Jul 2025"]
  };
  
  revenue: {
    lines: MonthlyFinancialLine[];
    monthlyTotals: MonthlyValue[];
    grandTotal: number;
  };
  
  expenses: {
    lines: MonthlyFinancialLine[];
    monthlyTotals: MonthlyValue[];
    grandTotal: number;
  };
  
  netIncome: {
    monthlyValues: MonthlyValue[];
    total: number;
  };
  
  metadata: {
    currency: string;
    reportBasis: string;
    columnsCount: number;
    linesCount: number;
  };
}

// Service business assumptions for forecasting
export interface ServiceBusinessAssumptions {
  // Growth parameters
  monthlyRevenueGrowth: number;    // % per month
  customerGrowthRate: number;      // % per month  
  averageProjectGrowth: number;    // % per year
  
  // Cost parameters
  laborInflation: number;          // % per year
  overheadInflation: number;       // % per year
  equipmentReplacementRate: number; // years
  
  // Cash flow parameters  
  daysSalesOutstanding: number;    // A/R collection days
  daysPayableOutstanding: number;  // A/P payment days
  cashReserveTarget: number;       // minimum cash $
}

// Data validation results
export interface DataValidationResult {
  isValid: boolean;
  completeness: number;        // 0-1 score
  monthsWithData: number;
  monthsMissing: string[];
  mathematicalConsistency: boolean;
  warnings: string[];
  errors: string[];
}