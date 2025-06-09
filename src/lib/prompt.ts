interface CompanyData {
  companyName: string;
  currentCash: number;
  monthlyBurnRate: number;
  monthlyRevenue: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

interface FinancialData {
  balanceSheet: any;
  profitAndLoss: any;
  cashFlow: any;
}

interface PromptResult {
  type: 'success' | 'auth_required' | 'error';
  message?: string;
  prompt?: string;
}

export async function createPrompt(
  message: string,
  companyData: CompanyData,
  financialData: FinancialData
): Promise<PromptResult> {
  // For now, just return a simple prompt
  return {
    type: 'success',
    prompt: `You are a financial advisor for ${companyData.companyName}. The user asks: ${message}`
  };
} 