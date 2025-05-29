export type TimePeriod = 'monthly' | 'quarterly' | 'yearly';

export interface FinancialEntry {
  date: Date;
  amount: number;
  category: string;
  type: 'actual' | 'forecast' | 'historical';
}

export interface RevenueStream {
  name: string;
  entries: FinancialEntry[];
  growthRate?: number; // Annual growth rate as decimal
  seasonality?: number[]; // Monthly seasonality factors
}

export interface ExpenseCategory {
  name: string;
  entries: FinancialEntry[];
  isFixed: boolean;
  isRecurring: boolean;
  frequency: TimePeriod;
}

export interface CompanyFinancials {
  cashBalance: number;
  revenueStreams: RevenueStream[];
  expenses: ExpenseCategory[];
  startDate: Date;
  endDate: Date;
}

export interface RunwayProjection {
  date: Date;
  cashBalance: number;
  revenue: number;
  expenses: number;
  netCashFlow: number;
}

export interface RunwayAnalysis {
  currentRunway: number; // in months
  projections: RunwayProjection[];
  breakEvenDate: Date | null;
  monthlyBurnRate: number;
  options: RunwayOption[];
}

export interface RunwayOption {
  id: string;
  name: string;
  description: string;
  impact: {
    type: 'revenue' | 'expense' | 'timing';
    value: number;
    period: TimePeriod;
  };
  implementationCost?: number;
  implementationTime?: number; // in days
  risk: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
} 