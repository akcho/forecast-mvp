import { addMonths, differenceInMonths, isAfter, isBefore, startOfMonth } from 'date-fns';
import {
  CompanyFinancials,
  RunwayAnalysis,
  RunwayOption,
  RunwayProjection,
  TimePeriod,
} from '../types/financial';

export class RunwayCalculator {
  private financials: CompanyFinancials;
  private currentDate: Date;

  constructor(financials: CompanyFinancials) {
    this.financials = financials;
    this.currentDate = new Date();
  }

  private calculateMonthlyRevenue(date: Date): number {
    return this.financials.revenueStreams.reduce((total, stream) => {
      // Find the base amount from the most recent entry
      const latestEntry = stream.entries
        .filter(entry => !isAfter(new Date(entry.date), date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      if (!latestEntry) return total;

      let amount = latestEntry.amount;

      // Apply growth rate if available
      if (stream.growthRate) {
        const monthsFromStart = differenceInMonths(date, this.financials.startDate);
        const growthFactor = Math.pow(1 + stream.growthRate / 12, monthsFromStart);
        amount *= growthFactor;
      }

      // Apply seasonality if available
      if (stream.seasonality) {
        const monthIndex = date.getMonth();
        const seasonalityFactor = stream.seasonality[monthIndex] || 1;
        amount *= seasonalityFactor;
      }

      return total + amount;
    }, 0);
  }

  private calculateMonthlyExpenses(date: Date): number {
    return this.financials.expenses.reduce((total, expense) => {
      // For monthly expenses, use the most recent entry
      if (expense.frequency === 'monthly') {
        const latestEntry = expense.entries
          .filter(entry => !isAfter(new Date(entry.date), date))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        if (latestEntry) {
          let amount = latestEntry.amount;
          
          // Apply growth rate for non-fixed expenses
          if (!expense.isFixed) {
            const monthsFromStart = differenceInMonths(date, this.financials.startDate);
            const growthFactor = Math.pow(1 + 0.05 / 12, monthsFromStart); // 5% annual growth for variable expenses
            amount *= growthFactor;
          }
          
          return total + amount;
        }
      }

      // For quarterly and yearly expenses, find the relevant entry
      const relevantEntry = expense.entries.find(entry => {
        const entryDate = new Date(entry.date);
        return (
          entryDate.getMonth() === date.getMonth() &&
          entryDate.getFullYear() === date.getFullYear()
        );
      });

      if (relevantEntry) {
        let amount = relevantEntry.amount;
        
        // Apply growth rate for non-fixed expenses
        if (!expense.isFixed) {
          const monthsFromStart = differenceInMonths(date, this.financials.startDate);
          const growthFactor = Math.pow(1 + 0.05 / 12, monthsFromStart); // 5% annual growth for variable expenses
          amount *= growthFactor;
        }
        
        switch (expense.frequency) {
          case 'quarterly':
            return total + amount / 3;
          case 'yearly':
            return total + amount / 12;
          default:
            return total + amount;
        }
      }

      return total;
    }, 0);
  }

  private calculateProjections(): RunwayProjection[] {
    const projections: RunwayProjection[] = [];
    let currentBalance = this.financials.cashBalance;
    let currentDate = startOfMonth(this.currentDate);

    // Get initial revenue and expenses
    let lastRevenue = this.calculateMonthlyRevenue(currentDate);
    let lastExpenses = this.calculateMonthlyExpenses(currentDate);

    while (isBefore(currentDate, this.financials.endDate)) {
      // Calculate new revenue with growth and seasonality
      const revenue = this.calculateMonthlyRevenue(currentDate);
      
      // Calculate new expenses
      const expenses = this.calculateMonthlyExpenses(currentDate);
      
      const netCashFlow = revenue - expenses;
      currentBalance += netCashFlow;

      projections.push({
        date: new Date(currentDate),
        cashBalance: currentBalance,
        revenue,
        expenses,
        netCashFlow,
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
    const breakEvenProjection = projections.find(p => p.netCashFlow >= 0);
    return breakEvenProjection ? breakEvenProjection.date : null;
  }

  private calculateMonthlyBurnRate(): number {
    const lastThreeMonths = this.financials.expenses
      .flatMap(expense => expense.entries)
      .filter(entry => {
        const entryDate = new Date(entry.date);
        const threeMonthsAgo = addMonths(this.currentDate, -3);
        return isAfter(entryDate, threeMonthsAgo) && !isAfter(entryDate, this.currentDate);
      })
      .reduce((sum, entry) => sum + entry.amount, 0);

    return lastThreeMonths / 3;
  }

  private calculateRunwayOptions(): RunwayOption[] {
    const monthlyBurnRate = this.calculateMonthlyBurnRate();
    const currentRunway = this.calculateCurrentRunway();

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
          value: this.calculateMonthlyRevenue(this.currentDate) * 0.1,
          period: 'monthly',
        },
        implementationTime: 15,
        risk: 'medium',
        confidence: 0.7,
      },
    ];
  }

  private calculateCurrentRunway(): number {
    const projections = this.calculateProjections();
    const zeroBalanceProjection = projections.find(p => p.cashBalance <= 0);
    if (!zeroBalanceProjection) {
      return differenceInMonths(this.financials.endDate, this.currentDate);
    }
    return differenceInMonths(zeroBalanceProjection.date, this.currentDate);
  }

  public analyzeRunway(): RunwayAnalysis {
    const projections = this.calculateProjections();
    const breakEvenDate = this.calculateBreakEvenDate(projections);
    const monthlyBurnRate = this.calculateMonthlyBurnRate();
    const options = this.calculateRunwayOptions();

    return {
      currentRunway: this.calculateCurrentRunway(),
      projections,
      breakEvenDate,
      monthlyBurnRate,
      options,
    };
  }

  public simulateOption(option: RunwayOption): RunwayAnalysis {
    // Create a copy of financials to simulate the option
    const simulatedFinancials = { ...this.financials };
    
    // Apply the option's impact
    if (option.impact.type === 'expense') {
      simulatedFinancials.expenses = simulatedFinancials.expenses.map(expense => ({
        ...expense,
        entries: expense.entries.map(entry => ({
          ...entry,
          amount: entry.amount * (1 - option.impact.value / this.calculateMonthlyBurnRate()),
        })),
      }));
    } else if (option.impact.type === 'revenue') {
      simulatedFinancials.revenueStreams = simulatedFinancials.revenueStreams.map(stream => ({
        ...stream,
        entries: stream.entries.map(entry => ({
          ...entry,
          amount: entry.amount * (1 + option.impact.value / this.calculateMonthlyRevenue(this.currentDate)),
        })),
      }));
    }

    // Create new calculator with simulated data
    const simulatedCalculator = new RunwayCalculator(simulatedFinancials);
    return simulatedCalculator.analyzeRunway();
  }
} 