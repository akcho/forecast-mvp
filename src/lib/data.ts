import { QuickBooksService } from './quickbooks/service';

interface QuickBooksColData {
  value: string;
}

interface QuickBooksHeader {
  ColData: QuickBooksColData[];
}

interface QuickBooksRow {
  Header?: QuickBooksHeader;
  Rows?: {
    Row: QuickBooksRow[];
  };
  Summary?: {
    ColData: QuickBooksColData[];
  };
  type: string;
}

interface QuickBooksReport {
  Header: {
    Time: string;
    ReportName: string;
    DateMacro: string;
    ReportBasis: string;
    StartPeriod: string;
    EndPeriod: string;
    Currency: string;
  };
  Columns: {
    Column: Array<{
      ColTitle: string;
      ColType: string;
    }>;
  };
  Rows: {
    Row: QuickBooksRow[];
  };
}

interface QuickBooksCompanyInfo {
  CompanyInfo: {
    CompanyName: string;
  };
}

interface CompanyData {
  companyName: string;
  currentCash: number;
  monthlyBurnRate: number;
  monthlyRevenue: number;
  netMonthlyCashFlow: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

interface FinancialData {
  balanceSheet: any;
  profitAndLoss: any;
  cashFlow: any;
}

export async function getCompanyData(sessionId: string): Promise<CompanyData> {
  try {
    const quickbooks = QuickBooksService.getInstance();
    const [companyInfo, balanceSheet, profitAndLoss] = await Promise.all([
      quickbooks.getCompanyInfo(sessionId),
      quickbooks.getBalanceSheet(sessionId),
      quickbooks.getProfitAndLoss(sessionId),
    ]);

    console.log('Raw API Responses:', {
      companyInfo: JSON.stringify(companyInfo, null, 2),
      balanceSheet: JSON.stringify(balanceSheet, null, 2),
      profitAndLoss: JSON.stringify(profitAndLoss, null, 2)
    });

    // Extract relevant data from QuickBooks responses
    const company = companyInfo.CompanyInfo;
    if (!company) {
      throw new Error('Company info not found in response');
    }

    const balanceSheetData = balanceSheet as QuickBooksReport;
    const profitAndLossData = profitAndLoss as QuickBooksReport;

    // Calculate monthly burn rate and revenue from Profit & Loss
    const totalExpenses = profitAndLossData.Rows.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'Expenses')
    )?.Summary?.ColData[1]?.value || '0';

    const totalIncome = profitAndLossData.Rows.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'Income')
    )?.Summary?.ColData[1]?.value || '0';

    console.log('Found financial values:', {
      totalExpenses,
      totalIncome,
      rawExpenses: profitAndLossData.Rows.Row.find((row: any) => 
        row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'Expenses')
      ),
      rawIncome: profitAndLossData.Rows.Row.find((row: any) => 
        row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'Income')
      )
    });

    const monthlyExpenses = totalExpenses ? Math.abs(parseFloat(totalExpenses)) / 12 : 0;
    const monthlyRevenue = totalIncome ? parseFloat(totalIncome) / 12 : 0;
    
    // Calculate net monthly cash flow
    const netMonthlyCashFlow = monthlyRevenue - monthlyExpenses;
    
    // Burn rate is total monthly expenses, regardless of revenue
    const monthlyBurnRate = monthlyExpenses;

    // Get current cash from balance sheet - navigate through the nested structure
    const assetsSection = balanceSheetData.Rows.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'ASSETS')
    );

    const currentAssets = assetsSection?.Rows?.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'Current Assets')
    );

    const bankAccounts = currentAssets?.Rows?.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'Bank Accounts')
    );

    const currentCash = bankAccounts?.Summary?.ColData[1]?.value || '0';

    console.log('Found cash data:', {
      assetsSection,
      currentAssets,
      bankAccounts,
      currentCash
    });

    // Get total assets, liabilities, and equity
    const totalAssets = assetsSection?.Summary?.ColData[1]?.value || '0';

    const liabilitiesSection = balanceSheetData.Rows.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'LIABILITIES AND EQUITY')
    );

    const totalLiabilities = liabilitiesSection?.Rows?.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'Total Liabilities')
    )?.Summary?.ColData[1]?.value || '0';

    const totalEquity = liabilitiesSection?.Rows?.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => col.value === 'Total Equity')
    )?.Summary?.ColData[1]?.value || '0';

    const data = {
      companyName: company.CompanyName,
      currentCash: parseFloat(currentCash),
      monthlyBurnRate,
      monthlyRevenue,
      netMonthlyCashFlow,
      totalAssets: parseFloat(totalAssets),
      totalLiabilities: parseFloat(totalLiabilities),
      totalEquity: parseFloat(totalEquity),
    };

    console.log('Final processed data:', data);
    return data;
  } catch (error) {
    console.error('Error getting company data:', error);
    throw error;
  }
}

export async function getFinancialData(sessionId: string): Promise<FinancialData> {
  try {
    const quickbooks = QuickBooksService.getInstance();
    const [balanceSheet, profitAndLoss, cashFlow] = await Promise.all([
      quickbooks.getBalanceSheet(sessionId),
      quickbooks.getProfitAndLoss(sessionId),
      quickbooks.getCashFlow(sessionId),
    ]);

    return {
      balanceSheet,
      profitAndLoss,
      cashFlow,
    };
  } catch (error) {
    console.error('Error getting financial data:', error);
    throw error;
  }
} 

export async function getFinancialInsightsFromReports(
  profitLossReport: any,
  balanceSheetReport: any,
  cashFlowReport: any,
  timePeriod: string
): Promise<{
  companyName: string;
  timePeriod: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  currentCash: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  monthlyBurnRate: number;
  runwayMonths: number;
  cashFlowFromOperations: number;
  summary: string;
}> {
  try {
    // Extract company name from any report header
    const companyName = profitLossReport?.Header?.ReportName || 'Your Company';
    
    // Extract key metrics from Profit & Loss
    const pnlData = extractPnlMetrics(profitLossReport);
    
    // Extract key metrics from Balance Sheet
    const balanceSheetData = extractBalanceSheetMetrics(balanceSheetReport);
    
    // Extract key metrics from Cash Flow
    const cashFlowData = extractCashFlowMetrics(cashFlowReport);
    
    // Calculate monthly burn rate (total expenses for the period / number of months)
    const monthsInPeriod = timePeriod === '3months' ? 3 : timePeriod === '6months' ? 6 : 12;
    const monthlyBurnRate = pnlData.totalExpenses / monthsInPeriod;
    
    // Calculate runway
    const runwayMonths = balanceSheetData.currentCash > 0 && monthlyBurnRate > 0 
      ? parseFloat((balanceSheetData.currentCash / monthlyBurnRate).toFixed(1))
      : 0;
    
    // Create summary
    const summary = `For the ${timePeriod} period ending ${profitLossReport?.Header?.EndPeriod || 'recently'}, ` +
      `${companyName} had revenue of $${pnlData.revenue.toLocaleString()}, ` +
      `expenses of $${pnlData.totalExpenses.toLocaleString()}, ` +
      `and ${pnlData.netIncome >= 0 ? 'profit' : 'loss'} of $${Math.abs(pnlData.netIncome).toLocaleString()}. ` +
      `Current cash balance is $${balanceSheetData.currentCash.toLocaleString()}, ` +
      `and monthly burn rate is $${monthlyBurnRate.toLocaleString()}. ` +
      `Runway is ${runwayMonths > 0 ? `${runwayMonths} months` : 'N/A'} months.`;
    
    return {
      companyName,
      timePeriod,
      revenue: pnlData.revenue,
      expenses: pnlData.totalExpenses,
      netIncome: pnlData.netIncome,
      currentCash: balanceSheetData.currentCash,
      totalAssets: balanceSheetData.totalAssets,
      totalLiabilities: balanceSheetData.totalLiabilities,
      totalEquity: balanceSheetData.totalEquity,
      monthlyBurnRate,
      runwayMonths,
      cashFlowFromOperations: cashFlowData.operatingCashFlow,
      summary
    };
  } catch (error) {
    console.error('Error extracting financial insights:', error);
    throw error;
  }
}

function extractPnlMetrics(report: any): {
  revenue: number;
  totalExpenses: number;
  netIncome: number;
} {
  if (!report?.Rows?.Row) {
    return { revenue: 0, totalExpenses: 0, netIncome: 0 };
  }
  
  let revenue = 0;
  let totalExpenses = 0;
  let netIncome = 0;
  
  // Find the Income section
  const incomeSection = report.Rows.Row.find((row: any) => 
    row.type === 'Section' && row.Header?.ColData.some((col: any) => 
      col.value.toLowerCase().includes('income') || col.value.toLowerCase().includes('revenue')
    )
  );
  
  if (incomeSection?.Summary?.ColData) {
    // Get the total from the last column (usually the total)
    const totalValue = incomeSection.Summary.ColData[incomeSection.Summary.ColData.length - 1]?.value;
    revenue = totalValue ? Math.abs(parseFloat(totalValue)) : 0;
  }
  
  // Find the Expenses section
  const expensesSection = report.Rows.Row.find((row: any) => 
    row.type === 'Section' && row.Header?.ColData.some((col: any) => 
      col.value.toLowerCase().includes('expense') || col.value.toLowerCase().includes('cost')
    )
  );
  
  if (expensesSection?.Summary?.ColData) {
    const totalValue = expensesSection.Summary.ColData[expensesSection.Summary.ColData.length - 1]?.value;
    totalExpenses = totalValue ? Math.abs(parseFloat(totalValue)) : 0;
  }
  
  // Find Net Income - try to find it in the report first
  const netIncomeRow = report.Rows.Row.find((row: any) => 
    row.type === 'Section' && row.Header?.ColData.some((col: any) => 
      col.value.toLowerCase().includes('net income') || col.value.toLowerCase().includes('net profit')
    )
  );
  
  if (netIncomeRow?.Summary?.ColData) {
    const totalValue = netIncomeRow.Summary.ColData[netIncomeRow.Summary.ColData.length - 1]?.value;
    netIncome = totalValue ? parseFloat(totalValue) : 0;
  } else {
    // Calculate net income as revenue - expenses if not found in report
    netIncome = revenue - totalExpenses;
  }
  
  return { revenue, totalExpenses, netIncome };
}

function extractBalanceSheetMetrics(report: any): {
  currentCash: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
} {
  if (!report?.Rows?.Row) {
    return { currentCash: 0, totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
  }
  
  let currentCash = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  
  // Find Assets section
  const assetsSection = report.Rows.Row.find((row: any) => 
    row.type === 'Section' && row.Header?.ColData.some((col: any) => 
      col.value.toLowerCase().includes('asset')
    )
  );
  
  if (assetsSection?.Summary?.ColData) {
    const totalValue = assetsSection.Summary.ColData[assetsSection.Summary.ColData.length - 1]?.value;
    totalAssets = totalValue ? parseFloat(totalValue) : 0;
  }
  
  // Find Current Assets and then Bank Accounts
  if (assetsSection?.Rows?.Row) {
    const currentAssetsSection = assetsSection.Rows.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => 
        col.value.toLowerCase().includes('current asset')
      )
    );
    
    if (currentAssetsSection?.Rows?.Row) {
      const bankAccountsSection = currentAssetsSection.Rows.Row.find((row: any) => 
        row.type === 'Section' && row.Header?.ColData.some((col: any) => 
          col.value.toLowerCase().includes('bank') || col.value.toLowerCase().includes('cash')
        )
      );
      
      if (bankAccountsSection?.Summary?.ColData) {
        const totalValue = bankAccountsSection.Summary.ColData[bankAccountsSection.Summary.ColData.length - 1]?.value;
        currentCash = totalValue ? parseFloat(totalValue) : 0;
      }
    }
  }
  
  // Find Liabilities and Equity section
  const liabilitiesSection = report.Rows.Row.find((row: any) => 
    row.type === 'Section' && row.Header?.ColData.some((col: any) => 
      col.value.toLowerCase().includes('liability') || col.value.toLowerCase().includes('equity')
    )
  );
  
  if (liabilitiesSection?.Rows?.Row) {
    // Find Total Liabilities
    const totalLiabilitiesRow = liabilitiesSection.Rows.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => 
        col.value.toLowerCase().includes('total liability')
      )
    );
    
    if (totalLiabilitiesRow?.Summary?.ColData) {
      const totalValue = totalLiabilitiesRow.Summary.ColData[totalLiabilitiesRow.Summary.ColData.length - 1]?.value;
      totalLiabilities = totalValue ? parseFloat(totalValue) : 0;
    }
    
    // Find Total Equity
    const totalEquityRow = liabilitiesSection.Rows.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => 
        col.value.toLowerCase().includes('total equity')
      )
    );
    
    if (totalEquityRow?.Summary?.ColData) {
      const totalValue = totalEquityRow.Summary.ColData[totalEquityRow.Summary.ColData.length - 1]?.value;
      totalEquity = totalValue ? parseFloat(totalValue) : 0;
    }
  }
  
  // If we couldn't find the nested structure, try to find direct sections
  if (totalLiabilities === 0) {
    const totalLiabilitiesDirect = report.Rows.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => 
        col.value.toLowerCase().includes('total liability')
      )
    );
    
    if (totalLiabilitiesDirect?.Summary?.ColData) {
      const totalValue = totalLiabilitiesDirect.Summary.ColData[totalLiabilitiesDirect.Summary.ColData.length - 1]?.value;
      totalLiabilities = totalValue ? parseFloat(totalValue) : 0;
    }
  }
  
  if (totalEquity === 0) {
    const totalEquityDirect = report.Rows.Row.find((row: any) => 
      row.type === 'Section' && row.Header?.ColData.some((col: any) => 
        col.value.toLowerCase().includes('total equity')
      )
    );
    
    if (totalEquityDirect?.Summary?.ColData) {
      const totalValue = totalEquityDirect.Summary.ColData[totalEquityDirect.Summary.ColData.length - 1]?.value;
      totalEquity = totalValue ? parseFloat(totalValue) : 0;
    } else {
      // Calculate equity as assets - liabilities if not found in report
      totalEquity = totalAssets - totalLiabilities;
    }
  }
  
  return { currentCash, totalAssets, totalLiabilities, totalEquity };
}

function extractCashFlowMetrics(report: any): {
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
} {
  if (!report?.Rows?.Row) {
    return { operatingCashFlow: 0, investingCashFlow: 0, financingCashFlow: 0, netCashFlow: 0 };
  }
  
  let operatingCashFlow = 0;
  let investingCashFlow = 0;
  let financingCashFlow = 0;
  let netCashFlow = 0;
  
  // Find Operating Activities
  const operatingSection = report.Rows.Row.find((row: any) => 
    row.type === 'Section' && row.Header?.ColData.some((col: any) => 
      col.value.toLowerCase().includes('operating')
    )
  );
  
  if (operatingSection?.Summary?.ColData) {
    const totalValue = operatingSection.Summary.ColData[operatingSection.Summary.ColData.length - 1]?.value;
    operatingCashFlow = totalValue ? parseFloat(totalValue) : 0;
  }
  
  // Find Investing Activities
  const investingSection = report.Rows.Row.find((row: any) => 
    row.type === 'Section' && row.Header?.ColData.some((col: any) => 
      col.value.toLowerCase().includes('investing')
    )
  );
  
  if (investingSection?.Summary?.ColData) {
    const totalValue = investingSection.Summary.ColData[investingSection.Summary.ColData.length - 1]?.value;
    investingCashFlow = totalValue ? parseFloat(totalValue) : 0;
  }
  
  // Find Financing Activities
  const financingSection = report.Rows.Row.find((row: any) => 
    row.type === 'Section' && row.Header?.ColData.some((col: any) => 
      col.value.toLowerCase().includes('financing')
    )
  );
  
  if (financingSection?.Summary?.ColData) {
    const totalValue = financingSection.Summary.ColData[financingSection.Summary.ColData.length - 1]?.value;
    financingCashFlow = totalValue ? parseFloat(totalValue) : 0;
  }
  
  // Calculate net cash flow
  netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
  
  return { operatingCashFlow, investingCashFlow, financingCashFlow, netCashFlow };
} 