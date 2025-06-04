export type TimePeriod = 'monthly' | 'quarterly' | 'yearly';

export interface FinancialEntry {
  id: string;
  date: string;
  amount: number;
  description?: string;
}

export interface RevenueStream {
  id: string;
  name: string;
  entries: FinancialEntry[];
  isRecurring: boolean;
  frequency?: 'monthly' | 'quarterly' | 'yearly';
  growthRate?: number;
  seasonality?: {
    month: number;
    factor: number;
  }[];
}

export interface ExpenseCategory {
  id: string;
  name: string;
  entries: FinancialEntry[];
  isFixed: boolean;
  frequency: 'monthly' | 'quarterly' | 'yearly';
}

export interface CompanyFinancials {
  startDate: Date;
  endDate: Date;
  revenueStreams: RevenueStream[];
  expenses: ExpenseCategory[];
  initialProjection: RunwayProjection;
  cashBalance: number;
}

export interface RunwayProjection {
  date: Date;
  revenue: number;
  expenses: number;
  netIncome: number;
  cumulativeCash: number;
  cashBalance: number;
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

export interface CalculatedValue {
  id: string;
  type: 'expense' | 'revenue';
  entityId: string;
  date: Date;
  amount: number;
  lastCalculated: Date;
  metadata: {
    calculatedAt?: Date;
    source?: string;
    version?: string;
    category?: string;
    isFixed?: boolean;
    frequency?: TimePeriod;
    growthRate?: number;
    monthsFromLatest?: number;
  };
} 