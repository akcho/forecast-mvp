import { QuickBooksClient } from './quickbooks/client';

interface Expense {
  category: string;
  amount: number;
}

interface CompanyData {
  companyName: string;
  currentCash: number;
  monthlyBurnRate: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  topExpenses: Expense[];
}

export async function getCompanyData(): Promise<CompanyData> {
  const client = new QuickBooksClient();
  
  // Fetch all required reports
  const [profitLoss, balanceSheet, cashFlow] = await Promise.all([
    client.getProfitAndLoss(),
    client.getBalanceSheet(),
    client.getCashFlow()
  ]);

  // Extract company name from QuickBooks data
  const companyName = balanceSheet?.QueryResponse?.Report?.Header?.ReportName || "Your Company";

  // Get current cash from balance sheet
  const bankAccounts = balanceSheet?.QueryResponse?.Report?.Rows?.Row
    ?.find(row => row.Header?.ColData[0].value === 'Bank Accounts')
    ?.Rows?.Row || [];
  const currentCash = bankAccounts
    .filter(row => row.type === 'Data')
    .reduce((sum, row) => sum + parseFloat(row.ColData[1].value), 0);

  // Get monthly revenue from profit & loss
  const incomeSection = profitLoss?.QueryResponse?.Report?.Rows?.Row
    ?.find(row => row.Header?.ColData[0].value === 'Income');
  const monthlyRevenue = incomeSection?.Rows?.Row
    ?.filter(row => row.type === 'Data')
    .reduce((sum, row) => sum + parseFloat(row.ColData[1].value), 0) || 0;

  // Get monthly expenses from profit & loss
  const expenseSection = profitLoss?.QueryResponse?.Report?.Rows?.Row
    ?.find(row => row.Header?.ColData[0].value === 'Expenses');
  const monthlyBurnRate = expenseSection?.Rows?.Row
    ?.filter(row => row.type === 'Data')
    .reduce((sum, row) => sum + parseFloat(row.ColData[1].value), 0) || 0;

  // Get top expenses
  const topExpenses = expenseSection?.Rows?.Row
    ?.filter(row => row.type === 'Data')
    .map(row => ({
      category: row.ColData[0].value,
      amount: parseFloat(row.ColData[1].value)
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3) || [];

  // Calculate revenue growth from cash flow
  const operatingActivities = cashFlow?.QueryResponse?.Report?.Rows?.Row
    ?.find(row => row.Header?.ColData[0].value === 'OPERATING ACTIVITIES');
  const netIncome = operatingActivities?.Rows?.Row
    ?.find(row => row.Header?.ColData[0].value === 'Net Income')
    ?.ColData[1].value || 0;
  
  // Simple growth calculation (can be improved with historical data)
  const revenueGrowth = monthlyRevenue > 0 ? (netIncome / monthlyRevenue) : 0;

  return {
    companyName,
    currentCash,
    monthlyBurnRate,
    monthlyRevenue,
    revenueGrowth,
    topExpenses
  };
} 