import { addMonths, startOfMonth } from 'date-fns';
import { FinancialCalculationService } from './financialCalculations';
import { CompanyFinancials } from '@/types/financial';

export class CalculationJob {
  private static instance: CalculationJob;
  private financialService: FinancialCalculationService;
  private isRunning: boolean = false;

  private constructor() {
    this.financialService = FinancialCalculationService.getInstance();
  }

  public static getInstance(): CalculationJob {
    if (!CalculationJob.instance) {
      CalculationJob.instance = new CalculationJob();
    }
    return CalculationJob.instance;
  }

  private generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    let currentDate = startOfMonth(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate = addMonths(currentDate, 1);
    }
    
    return dates;
  }

  public async precalculateValues(financials: CompanyFinancials): Promise<void> {
    if (this.isRunning) {
      console.log('Calculation job is already running');
      return;
    }

    try {
      this.isRunning = true;
      console.log('Starting pre-calculation job...');

      const dates = this.generateDateRange(financials.startDate, financials.endDate);
      
      // Pre-calculate expenses
      for (const expense of financials.expenses) {
        for (const date of dates) {
          await this.financialService.calculateExpenseAmount(expense, date);
        }
      }

      // Pre-calculate revenue
      for (const revenue of financials.revenueStreams) {
        for (const date of dates) {
          await this.financialService.calculateRevenueAmount(revenue, date);
        }
      }

      console.log('Pre-calculation job completed successfully');
    } catch (error) {
      console.error('Error in pre-calculation job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  public isJobRunning(): boolean {
    return this.isRunning;
  }
} 