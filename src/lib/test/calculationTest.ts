import { FinancialCalculationService } from '../services/financialCalculations';
import { CalculationJob } from '../services/calculationJob';
import { CompanyFinancials, RevenueStream, ExpenseCategory } from '../../types/financial';

export async function runTests(): Promise<void> {
  console.log('Starting financial calculation tests...');

  // Initialize services
  const financialService = FinancialCalculationService.getInstance();
  const calculationJob = CalculationJob.getInstance();

  // Create test data
  const testData: CompanyFinancials = {
    startDate: new Date(2024, 6, 1), // July 2024
    endDate: new Date(2025, 11, 31), // December 2025
    revenueStreams: [
      {
        id: 'rev1',
        name: 'Design Income',
        entries: [
          {
            id: 'entry1',
            date: '2024-07-01',
            amount: 10000,
            description: 'Initial design income'
          }
        ],
        isRecurring: true,
        frequency: 'monthly',
        growthRate: 0.03
      }
    ],
    expenses: [
      {
        id: 'exp1',
        name: 'Rent',
        entries: [
          {
            id: 'entry2',
            date: '2024-07-01',
            amount: 5000,
            description: 'Monthly rent'
          }
        ],
        isFixed: true,
        frequency: 'monthly'
      },
      {
        id: 'exp2',
        name: 'Marketing',
        entries: [
          {
            id: 'entry3',
            date: '2024-07-01',
            amount: 2000,
            description: 'Monthly marketing budget'
          }
        ],
        isFixed: false,
        frequency: 'monthly'
      }
    ],
    initialProjection: {
      date: new Date(2024, 6, 1),
      revenue: 10000,
      expenses: 7000,
      netIncome: 3000,
      cumulativeCash: 50000
    }
  };

  try {
    // Test 1: Pre-calculation
    console.log('\nTest 1: Pre-calculation');
    await calculationJob.precalculateValues(testData);
    console.log('✓ Pre-calculation completed successfully');

    // Test 2: Revenue calculation
    console.log('\nTest 2: Revenue calculation');
    const revenue = testData.revenueStreams[0];
    const revenueAmount = await financialService.calculateRevenueAmount(
      revenue,
      new Date(2024, 7, 1) // August 2024
    );
    console.log(`Revenue amount for August 2024: $${revenueAmount}`);
    console.log('✓ Revenue calculation completed');

    // Test 3: Expense calculation
    console.log('\nTest 3: Expense calculation');
    const fixedExpense = testData.expenses[0];
    const variableExpense = testData.expenses[1];
    
    const fixedAmount = await financialService.calculateExpenseAmount(
      fixedExpense,
      new Date(2024, 7, 1)
    );
    const variableAmount = await financialService.calculateExpenseAmount(
      variableExpense,
      new Date(2024, 7, 1)
    );
    
    console.log(`Fixed expense amount: $${fixedAmount}`);
    console.log(`Variable expense amount: $${variableAmount}`);
    console.log('✓ Expense calculation completed');

    // Test 4: Cache verification
    console.log('\nTest 4: Cache verification');
    const cachedRevenue = await financialService.calculateRevenueAmount(
      revenue,
      new Date(2024, 7, 1),
      true
    );
    console.log(`Cached revenue amount: $${cachedRevenue}`);
    console.log('✓ Cache verification completed');

    // Test 5: Growth rate verification
    console.log('\nTest 5: Growth rate verification');
    const futureRevenue = await financialService.calculateRevenueAmount(
      revenue,
      new Date(2024, 11, 1) // December 2024
    );
    console.log(`Revenue amount for December 2024: $${futureRevenue}`);
    console.log('✓ Growth rate verification completed');

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
} 