import { addMonths, differenceInMonths, isAfter, isBefore, startOfMonth } from 'date-fns';
import {
  CompanyFinancials,
  RunwayAnalysis,
  RunwayOption,
  RunwayProjection,
  TimePeriod,
  FinancialEntry,
} from '../types/financial';
import { FinancialCalculationService } from './services/financialCalculations';

export class RunwayCalculator {
  private financials: CompanyFinancials;
  private currentDate: Date;
  private financialService: FinancialCalculationService;

  constructor(financials: CompanyFinancials) {
    this.financials = financials;
    this.currentDate = new Date(financials.startDate);
    this.financialService = FinancialCalculationService.getInstance();
  }

  private calculateGrowthRate(entries: FinancialEntry[]): number {
    if (entries.length < 2) {
      return 0; // Not enough data to calculate growth
    }

    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate month-over-month growth rates
    const growthRates: number[] = [];
    for (let i = 1; i < sortedEntries.length; i++) {
      const currentAmount = sortedEntries[i].amount;
      const previousAmount = sortedEntries[i - 1].amount;
      
      if (previousAmount > 0) {
        const growthRate = (currentAmount - previousAmount) / previousAmount;
        growthRates.push(growthRate);
      }
    }

    // If we have growth rates, calculate the average
    if (growthRates.length > 0) {
      const averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
      return Math.min(Math.max(averageGrowthRate, -0.1), 0.2); // Cap between -10% and +20%
    }

    return 0;
  }

  private async calculateMonthlyRevenue(date: Date): Promise<number> {
    console.log('Calculating monthly revenue for:', date.toISOString());
    const amounts = await Promise.all(
      this.financials.revenueStreams.map(stream => 
        this.financialService.calculateRevenueAmount(stream, date)
      )
    );
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const finalTotal = Math.round(total * 100) / 100;
    console.log('Final monthly revenue:', finalTotal);
    return finalTotal;
  }

  private async calculateMonthlyExpenses(date: Date): Promise<number> {
    console.log('Calculating monthly expenses for:', date.toISOString());
    const amounts = await Promise.all(
      this.financials.expenses.map(expense => 
        this.financialService.calculateExpenseAmount(expense, date)
      )
    );
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const finalTotal = Math.round(total * 100) / 100;
    console.log('Final monthly expenses:', finalTotal);
    return finalTotal;
  }

  private async calculateProjections(): Promise<RunwayProjection[]> {
    const projections: RunwayProjection[] = [];
    let currentBalance = this.financials.cashBalance;
    let currentDate = new Date(this.financials.startDate);

    // Add the initial projection
    const initialRevenue = await this.calculateMonthlyRevenue(currentDate);
    const initialExpenses = await this.calculateMonthlyExpenses(currentDate);
    const initialNetCashFlow = initialRevenue - initialExpenses;

    projections.push({
      date: new Date(currentDate),
      cashBalance: currentBalance,
      revenue: initialRevenue,
      expenses: initialExpenses,
      netCashFlow: initialNetCashFlow,
      netIncome: initialNetCashFlow,
      cumulativeCash: currentBalance
    });

    // Move to the next month for future projections
    currentDate = addMonths(currentDate, 1);

    while (isBefore(currentDate, this.financials.endDate)) {
      // Calculate new revenue with growth and seasonality
      const revenue = await this.calculateMonthlyRevenue(currentDate);
      
      // Calculate new expenses
      const expenses = await this.calculateMonthlyExpenses(currentDate);
      
      const netCashFlow = revenue - expenses;
      currentBalance += netCashFlow;

      projections.push({
        date: new Date(currentDate),
        cashBalance: currentBalance,
        revenue,
        expenses,
        netCashFlow,
        netIncome: netCashFlow,
        cumulativeCash: currentBalance
      });

      currentDate = addMonths(currentDate, 1);

      // Stop if we've hit zero
      if (currentBalance <= 0) {
        break;
      }
    }

    return projections;
  }

  private calculateBreakEvenDate(projections: RunwayProjection[]): Date | null {
    console.log('Calculating break even date...');
    console.log('Start date:', this.financials.startDate);
    console.log('Projections:', projections.map(p => ({
      date: p.date.toISOString(),
      netCashFlow: p.netCashFlow
    })));

    // Find the first month where we have positive cash flow, but only after our start date
    const breakEvenProjection = projections.find(p => {
      const isAfterStart = !isBefore(p.date, new Date(this.financials.startDate.toISOString()));
      const hasPositiveFlow = p.netCashFlow >= 0;
      console.log(`Checking projection for ${p.date.toISOString()}:`, {
        isAfterStart,
        hasPositiveFlow,
        netCashFlow: p.netCashFlow
      });
      return isAfterStart && hasPositiveFlow;
    });
    
    console.log('Break even projection:', breakEvenProjection ? {
      date: breakEvenProjection.date.toISOString(),
      netCashFlow: breakEvenProjection.netCashFlow
    } : null);
    
    return breakEvenProjection?.date || null;
  }

  private async calculateMonthlyBurnRate(): Promise<number> {
    // Use the same calculation as monthly expenses to ensure consistency
    return await this.calculateMonthlyExpenses(this.currentDate);
  }

  private async calculateRunwayOptions(): Promise<RunwayOption[]> {
    const monthlyBurnRate = await this.calculateMonthlyBurnRate();
    const currentRunway = await this.calculateCurrentRunway();
    const currentRevenue = await this.calculateMonthlyRevenue(this.currentDate);

    return [
      {
        id: 'cut-expenses',
        name: 'Cut Expenses',
        description: 'Reduce monthly burn rate by 20%',
        impact: {
          type: 'expense',
          value: monthlyBurnRate * 0.2,
          period: 'monthly',
        },
        implementationTime: 30,
        risk: 'medium',
        confidence: 0.8,
      },
      {
        id: 'delay-hires',
        name: 'Delay Hires',
        description: 'Postpone planned hiring for 3 months',
        impact: {
          type: 'expense',
          value: monthlyBurnRate * 0.15,
          period: 'monthly',
        },
        implementationTime: 0,
        risk: 'low',
        confidence: 0.9,
      },
      {
        id: 'accelerate-ar',
        name: 'Accelerate AR',
        description: 'Implement aggressive collection strategy',
        impact: {
          type: 'revenue',
          value: currentRevenue * 0.1,
          period: 'monthly',
        },
        implementationTime: 15,
        risk: 'medium',
        confidence: 0.7,
      },
    ];
  }

  private async calculateCurrentRunway(): Promise<number> {
    const projections = await this.calculateProjections();
    const zeroBalanceProjection = projections.find(p => p.cashBalance <= 0);
    if (!zeroBalanceProjection) {
      return differenceInMonths(this.financials.endDate, this.currentDate);
    }
    return differenceInMonths(zeroBalanceProjection.date, this.currentDate);
  }

  public async analyzeRunway(): Promise<RunwayAnalysis> {
    const projections = await this.calculateProjections();
    const breakEvenDate = this.calculateBreakEvenDate(projections);
    const monthlyBurnRate = await this.calculateMonthlyBurnRate();
    const currentRunway = await this.calculateCurrentRunway();
    const options = await this.calculateRunwayOptions();

    return {
      currentRunway,
      projections,
      breakEvenDate,
      monthlyBurnRate,
      options,
    };
  }

  public async simulateOption(option: RunwayOption): Promise<RunwayAnalysis> {
    // Create a copy of financials to simulate the option
    const simulatedFinancials = { ...this.financials };
    
    // Apply the option's impact
    if (option.impact.type === 'expense') {
      const monthlyBurnRate = await this.calculateMonthlyBurnRate();
      simulatedFinancials.expenses = simulatedFinancials.expenses.map(expense => ({
        ...expense,
        entries: expense.entries.map(entry => ({
          ...entry,
          amount: entry.amount * (1 - option.impact.value / monthlyBurnRate),
        })),
      }));
    } else if (option.impact.type === 'revenue') {
      const currentRevenue = await this.calculateMonthlyRevenue(this.currentDate);
      simulatedFinancials.revenueStreams = simulatedFinancials.revenueStreams.map(stream => ({
        ...stream,
        entries: stream.entries.map(entry => ({
          ...entry,
          amount: entry.amount * (1 + option.impact.value / currentRevenue),
        })),
      }));
    }

    // Create new calculator with simulated data
    const simulatedCalculator = new RunwayCalculator(simulatedFinancials);
    return await simulatedCalculator.analyzeRunway();
  }
} 