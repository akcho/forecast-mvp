import { FinancialEntry, ExpenseCategory, RevenueStream, CalculatedValue } from '@/types/financial';
import { isAfter } from 'date-fns';
import { DatabaseService } from './database';

export class FinancialCalculationService {
  private static instance: FinancialCalculationService;
  private calculationCache: Map<string, number> = new Map();
  private database: DatabaseService;

  private constructor() {
    this.database = DatabaseService.getInstance();
  }

  public static getInstance(): FinancialCalculationService {
    if (!FinancialCalculationService.instance) {
      FinancialCalculationService.instance = new FinancialCalculationService();
    }
    return FinancialCalculationService.instance;
  }

  private getCacheKey(type: 'expense' | 'revenue', date: Date, id: string): string {
    return `${type}-${date.toISOString()}-${id}`;
  }

  private validateExpense(expense: ExpenseCategory): void {
    if (!expense.name) throw new Error('Expense must have a name');
    if (!expense.entries || !Array.isArray(expense.entries)) {
      throw new Error('Expense must have entries array');
    }
    if (typeof expense.isFixed !== 'boolean') {
      throw new Error('Expense must specify if it is fixed');
    }
    if (!expense.frequency) {
      throw new Error('Expense must specify frequency');
    }
  }

  private validateRevenue(revenue: RevenueStream): void {
    if (!revenue.name) throw new Error('Revenue stream must have a name');
    if (!revenue.entries || !Array.isArray(revenue.entries)) {
      throw new Error('Revenue stream must have entries array');
    }
  }

  private validateDate(date: Date): void {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
  }

  public async calculateExpenseAmount(
    expense: ExpenseCategory,
    date: Date,
    useCache: boolean = true
  ): Promise<number> {
    try {
      this.validateExpense(expense);
      this.validateDate(date);

      const cacheKey = this.getCacheKey('expense', date, expense.name);
      
      // Check cache first
      if (useCache && this.calculationCache.has(cacheKey)) {
        return this.calculationCache.get(cacheKey)!;
      }

      // Check database
      const dbValue = await this.database.getCalculatedValue(cacheKey);
      if (dbValue) {
        this.calculationCache.set(cacheKey, dbValue.amount);
        return dbValue.amount;
      }

      const latestEntry = expense.entries
        .filter((entry: FinancialEntry) => !isAfter(new Date(entry.date), date))
        .sort((a: FinancialEntry, b: FinancialEntry) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];

      if (!latestEntry) {
        return 0;
      }

      let amount = latestEntry.amount;

      // Apply growth rate for non-fixed expenses
      if (!expense.isFixed) {
        const monthsFromStart = Math.floor(
          (date.getTime() - new Date(latestEntry.date).getTime()) / (30 * 24 * 60 * 60 * 1000)
        );
        const growthFactor = Math.pow(1 + 0.05 / 12, monthsFromStart); // 5% annual growth
        amount *= growthFactor;
      }

      // Adjust for frequency
      switch (expense.frequency) {
        case 'quarterly':
          amount = amount / 3;
          break;
        case 'yearly':
          amount = amount / 12;
          break;
      }

      const finalAmount = Number(amount.toFixed(2));
      
      // Store in cache and database
      if (useCache) {
        this.calculationCache.set(cacheKey, finalAmount);
        await this.database.storeCalculatedValue({
          id: cacheKey,
          type: 'expense',
          entityId: expense.id,
          date,
          amount: finalAmount,
          lastCalculated: new Date(),
          metadata: {
            category: expense.name,
            isFixed: expense.isFixed,
            frequency: expense.frequency
          }
        });
      }

      return finalAmount;
    } catch (error) {
      console.error('Error calculating expense amount:', error);
      return 0;
    }
  }

  private calculateGrowthRate(entries: FinancialEntry[]): number {
    if (entries.length < 2) {
      return 0.02; // Default to 2% monthly growth if not enough data
    }

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const growthRates: number[] = [];
    for (let i = 1; i < sortedEntries.length; i++) {
      const currentAmount = sortedEntries[i].amount;
      const previousAmount = sortedEntries[i - 1].amount;
      
      if (previousAmount > 0) {
        const growthRate = (currentAmount - previousAmount) / previousAmount;
        growthRates.push(growthRate);
      }
    }

    if (growthRates.length > 0) {
      const averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
      return Math.min(Math.max(averageGrowthRate, -0.1), 0.2); // Cap between -10% and +20%
    }

    return 0.02; // Default to 2% monthly growth if no valid growth rates
  }

  public async calculateRevenueAmount(
    revenue: RevenueStream,
    date: Date,
    useCache: boolean = true
  ): Promise<number> {
    try {
      this.validateRevenue(revenue);
      this.validateDate(date);

      const cacheKey = this.getCacheKey('revenue', date, revenue.name);
      
      // Check cache first
      if (useCache && this.calculationCache.has(cacheKey)) {
        return this.calculationCache.get(cacheKey)!;
      }

      // Check database
      const dbValue = await this.database.getCalculatedValue(cacheKey);
      if (dbValue) {
        this.calculationCache.set(cacheKey, dbValue.amount);
        return dbValue.amount;
      }

      // Get the latest entry before or on the target date
      const latestEntry = revenue.entries
        .filter((entry: FinancialEntry) => !isAfter(new Date(entry.date), date))
        .sort((a: FinancialEntry, b: FinancialEntry) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];

      if (!latestEntry) {
        return 0;
      }

      // Start with the latest entry amount
      let amount = latestEntry.amount;

      // Calculate growth rate from historical data
      const growthRate = this.calculateGrowthRate(revenue.entries);
      
      // Calculate months between latest entry and target date
      const monthsFromLatest = Math.floor(
        (date.getTime() - new Date(latestEntry.date).getTime()) / (30 * 24 * 60 * 60 * 1000)
      );

      // Apply growth if we're projecting into the future
      if (monthsFromLatest > 0 && growthRate !== 0) {
        const growthFactor = Math.pow(1 + growthRate, monthsFromLatest);
        amount *= growthFactor;
      }

      // Apply seasonality if available
      if (revenue.seasonality) {
        const monthIndex = date.getMonth();
        const seasonalityEntry = revenue.seasonality.find(s => s.month === monthIndex);
        const seasonalityFactor = seasonalityEntry?.factor || 1;
        amount *= seasonalityFactor;
      }

      // Round to 2 decimal places
      const finalAmount = Number(amount.toFixed(2));
      
      // Store in cache and database
      if (useCache) {
        this.calculationCache.set(cacheKey, finalAmount);
        await this.database.storeCalculatedValue({
          id: cacheKey,
          type: 'revenue',
          entityId: revenue.id,
          date,
          amount: finalAmount,
          lastCalculated: new Date(),
          metadata: {
            category: revenue.name,
            growthRate,
            monthsFromLatest
          }
        });
      }

      return finalAmount;
    } catch (error) {
      console.error('Error calculating revenue amount:', error);
      return 0;
    }
  }

  public clearCache(): void {
    this.calculationCache.clear();
  }

  public async clearAllData(): Promise<void> {
    this.clearCache();
    await this.database.clearCalculatedValues();
  }
} 