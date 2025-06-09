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