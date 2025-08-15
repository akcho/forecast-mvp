/**
 * Sprint 1: Foundation service to analyze landscaping QB data
 * Tests our assumptions about business complexity detection
 */

import { QuickBooksServerAPI } from '@/lib/quickbooks/quickbooksServerAPI';

export interface LandscapingBusinessData {
  // Raw QB data
  profitLoss: any;
  balanceSheet: any;
  
  // Calculated metrics
  currentCash: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netCashFlow: number;
  totalReceivables: number;
  fixedAssets: number;
  
  // Business pattern analysis
  businessType: 'service' | 'product' | 'hybrid';
  revenueConsistency: number; // 0-1 score
  dataQuality: 'good' | 'limited' | 'poor';
  availableMonths: number;
}

export interface BusinessComplexityProfile {
  businessType: 'service' | 'product' | 'hybrid';
  complexity: 'simple' | 'moderate' | 'complex';
  confidence: number; // 0-100%
  
  // Analysis flags
  requiresARAnalysis: boolean;
  requiresSeasonalAnalysis: boolean;
  requiresCustomerAnalysis: boolean;
  requiresEquipmentSchedule: boolean;
  
  // Supporting data
  keyMetrics: {
    arBalance: number;
    equipmentValue: number;
    revenueVolatility: number;
    customerConcentration: number;
  };
}

export class LandscapingDataAnalyzer {
  private qbAPI: QuickBooksServerAPI;

  constructor(qbAPI: QuickBooksServerAPI) {
    this.qbAPI = qbAPI;
  }

  /**
   * Extract comprehensive data from QB for analysis
   */
  async extractComprehensiveData(_companyId: string): Promise<LandscapingBusinessData> {
    // Get basic financial reports
    const [profitLoss, balanceSheet] = await Promise.all([
      this.qbAPI.getProfitAndLoss(),
      this.qbAPI.getBalanceSheet()
    ]);

    // Extract basic metrics (reusing existing logic from ForecastContent)
    const currentCash = this.extractCashBalance(balanceSheet);
    const { monthlyRevenue, monthlyExpenses } = this.extractProfitLossData(profitLoss);
    const netCashFlow = monthlyRevenue - monthlyExpenses;
    
    // Extract additional metrics for complexity analysis
    const totalReceivables = this.extractReceivables(balanceSheet);
    const fixedAssets = this.extractFixedAssets(balanceSheet);
    
    // Analyze data patterns
    const businessType = this.classifyBusinessType(profitLoss, balanceSheet);
    const revenueConsistency = this.analyzeRevenueConsistency(profitLoss);
    const dataQuality = this.assessDataQuality(profitLoss, balanceSheet);
    const availableMonths = this.calculateAvailableMonths(profitLoss);

    return {
      profitLoss,
      balanceSheet,
      currentCash,
      monthlyRevenue,
      monthlyExpenses,
      netCashFlow,
      totalReceivables,
      fixedAssets,
      businessType,
      revenueConsistency,
      dataQuality,
      availableMonths
    };
  }

  /**
   * Test our business complexity detection algorithm
   */
  analyzeBusinessComplexity(data: LandscapingBusinessData): BusinessComplexityProfile {
    const { totalReceivables, fixedAssets, revenueConsistency, monthlyRevenue } = data;

    // Test thresholds from blueprint
    const requiresARAnalysis = totalReceivables > 10000;
    const requiresSeasonalAnalysis = revenueConsistency < 0.7; // High volatility
    const requiresCustomerAnalysis = true; // Always useful for service businesses
    const requiresEquipmentSchedule = fixedAssets > 25000;

    // Calculate complexity score
    let complexityScore = 0;
    if (requiresARAnalysis) complexityScore += 1;
    if (requiresSeasonalAnalysis) complexityScore += 1;
    if (requiresEquipmentSchedule) complexityScore += 1;
    if (monthlyRevenue > 50000) complexityScore += 1;

    const complexity = complexityScore <= 1 ? 'simple' : 
                     complexityScore <= 2 ? 'moderate' : 'complex';

    // Confidence based on data quality
    const confidence = data.dataQuality === 'good' ? 85 :
                      data.dataQuality === 'limited' ? 60 : 35;

    return {
      businessType: data.businessType,
      complexity,
      confidence,
      requiresARAnalysis,
      requiresSeasonalAnalysis,
      requiresCustomerAnalysis,
      requiresEquipmentSchedule,
      keyMetrics: {
        arBalance: totalReceivables,
        equipmentValue: fixedAssets,
        revenueVolatility: 1 - revenueConsistency,
        customerConcentration: 0 // TODO: Need customer data from QB
      }
    };
  }

  // Helper methods (simplified versions for Sprint 1)
  private extractCashBalance(balanceSheet: any): number {
    // Reuse existing logic from ForecastContent
    try {
      const report = balanceSheet.QueryResponse?.Report;
      if (!report?.Rows?.Row) return 0;

      const findBankAccounts = (rows: any[]): number => {
        for (const row of rows) {
          if (row.type === 'Section' && 
              row.Header?.ColData?.[0]?.value === 'Bank Accounts' &&
              row.Summary?.ColData) {
            return parseFloat(row.Summary.ColData[1].value.replace(/[^0-9.-]+/g, '') || '0');
          }
          if (row.Rows?.Row) {
            const result = findBankAccounts(row.Rows.Row);
            if (result > 0) return result;
          }
        }
        return 0;
      };

      return findBankAccounts(report.Rows.Row);
    } catch (error) {
      console.error('Error extracting cash balance:', error);
      return 0;
    }
  }

  private extractProfitLossData(profitLoss: any) {
    // Reuse existing logic from ForecastContent
    try {
      const report = profitLoss.QueryResponse?.Report;
      if (!report?.Rows?.Row) {
        return { monthlyRevenue: 0, monthlyExpenses: 0 };
      }

      const startDate = new Date(report.Header.StartPeriod);
      const endDate = new Date(report.Header.EndPeriod);
      const monthsInPeriod = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
        (endDate.getMonth() - startDate.getMonth()) + 1;

      const revenueSection = report.Rows.Row.find(
        (row: any) => row.Header?.ColData?.[0]?.value === 'Income'
      );
      const totalRevenue = this.extractSectionTotal(revenueSection);

      const expenseSection = report.Rows.Row.find(
        (row: any) => row.Header?.ColData?.[0]?.value === 'Expenses'
      );
      const totalExpenses = this.extractSectionTotal(expenseSection);

      return {
        monthlyRevenue: Math.round((totalRevenue / monthsInPeriod) * 100) / 100,
        monthlyExpenses: Math.round((totalExpenses / monthsInPeriod) * 100) / 100
      };
    } catch (error) {
      console.error('Error extracting P&L data:', error);
      return { monthlyRevenue: 0, monthlyExpenses: 0 };
    }
  }

  private extractSectionTotal(section: any): number {
    if (!section?.Rows?.Row) return 0;
    
    return section.Rows.Row.reduce((total: number, row: any) => {
      if (row.type === 'Data' && row.ColData) {
        const amount = parseFloat(row.ColData[1]?.value || '0');
        return total + amount;
      }
      return total;
    }, 0);
  }

  private extractReceivables(balanceSheet: any): number {
    try {
      const report = balanceSheet.QueryResponse?.Report;
      if (!report?.Rows?.Row) return 0;

      const findAccountsReceivable = (rows: any[]): number => {
        for (const row of rows) {
          // Look for "Accounts Receivable" section
          if (row.type === 'Section' && 
              row.Header?.ColData?.[0]?.value?.includes('Accounts Receivable') &&
              row.Summary?.ColData) {
            return parseFloat(row.Summary.ColData[1].value.replace(/[^0-9.-]+/g, '') || '0');
          }
          // Also check for A/R in current assets
          if (row.type === 'Data' && 
              row.ColData?.[0]?.value?.includes('Accounts Receivable')) {
            return parseFloat(row.ColData[1]?.value?.replace(/[^0-9.-]+/g, '') || '0');
          }
          if (row.Rows?.Row) {
            const result = findAccountsReceivable(row.Rows.Row);
            if (result > 0) return result;
          }
        }
        return 0;
      };

      return findAccountsReceivable(report.Rows.Row);
    } catch (error) {
      console.error('Error extracting receivables:', error);
      return 0;
    }
  }

  private extractFixedAssets(balanceSheet: any): number {
    try {
      const report = balanceSheet.QueryResponse?.Report;
      if (!report?.Rows?.Row) return 0;

      const findFixedAssets = (rows: any[]): number => {
        for (const row of rows) {
          // Look for "Fixed Assets" or "Property and Equipment" section
          if (row.type === 'Section' && 
              (row.Header?.ColData?.[0]?.value?.includes('Fixed Assets') ||
               row.Header?.ColData?.[0]?.value?.includes('Property and Equipment')) &&
              row.Summary?.ColData) {
            return parseFloat(row.Summary.ColData[1].value.replace(/[^0-9.-]+/g, '') || '0');
          }
          if (row.Rows?.Row) {
            const result = findFixedAssets(row.Rows.Row);
            if (result > 0) return result;
          }
        }
        return 0;
      };

      return findFixedAssets(report.Rows.Row);
    } catch (error) {
      console.error('Error extracting fixed assets:', error);
      return 0;
    }
  }

  private classifyBusinessType(profitLoss: any, balanceSheet: any): 'service' | 'product' | 'hybrid' {
    try {
      // Analyze expense structure to determine business type
      const report = profitLoss.QueryResponse?.Report;
      if (!report?.Rows?.Row) return 'service';

      const expenseSection = report.Rows.Row.find(
        (row: any) => row.Header?.ColData?.[0]?.value === 'Expenses'
      );

      if (!expenseSection?.Rows?.Row) return 'service';

      let laborCosts = 0;
      let materialCosts = 0;
      let totalExpenses = 0;

      // Analyze expense categories
      expenseSection.Rows.Row.forEach((row: any) => {
        if (row.type === 'Data' && row.ColData) {
          const expenseName = row.ColData[0]?.value?.toLowerCase() || '';
          const amount = parseFloat(row.ColData[1]?.value || '0');
          
          totalExpenses += amount;

          if (expenseName.includes('labor') || expenseName.includes('payroll') || 
              expenseName.includes('wages') || expenseName.includes('salary')) {
            laborCosts += amount;
          }
          if (expenseName.includes('material') || expenseName.includes('inventory') ||
              expenseName.includes('cost of goods') || expenseName.includes('cogs')) {
            materialCosts += amount;
          }
        }
      });

      const laborRatio = totalExpenses > 0 ? laborCosts / totalExpenses : 0;
      const materialRatio = totalExpenses > 0 ? materialCosts / totalExpenses : 0;

      // Classification thresholds
      if (materialRatio > 0.3) return 'product';
      if (laborRatio > 0.4) return 'service';
      if (materialRatio > 0.1 && laborRatio > 0.2) return 'hybrid';
      
      return 'service'; // Default for landscaping
    } catch (error) {
      console.error('Error classifying business type:', error);
      return 'service';
    }
  }

  private analyzeRevenueConsistency(profitLoss: any): number {
    try {
      const report = profitLoss.QueryResponse?.Report;
      if (!report?.Rows?.Row) return 0.8;

      // For now, return a default since we need monthly breakdowns
      // TODO: Extract monthly revenue data if available in report columns
      return 0.8; // Assume moderate consistency for landscaping
    } catch (error) {
      console.error('Error analyzing revenue consistency:', error);
      return 0.5;
    }
  }

  private assessDataQuality(profitLoss: any, balanceSheet: any): 'good' | 'limited' | 'poor' {
    try {
      let qualityScore = 0;
      
      // Check P&L completeness
      if (profitLoss.QueryResponse?.Report?.Rows?.Row) {
        qualityScore += 1;
      }
      
      // Check Balance Sheet completeness
      if (balanceSheet.QueryResponse?.Report?.Rows?.Row) {
        qualityScore += 1;
      }

      // Check for key sections in P&L
      const pnlReport = profitLoss.QueryResponse?.Report;
      if (pnlReport?.Rows?.Row) {
        const hasIncome = pnlReport.Rows.Row.some((row: any) => 
          row.Header?.ColData?.[0]?.value === 'Income'
        );
        const hasExpenses = pnlReport.Rows.Row.some((row: any) => 
          row.Header?.ColData?.[0]?.value === 'Expenses'
        );
        
        if (hasIncome) qualityScore += 1;
        if (hasExpenses) qualityScore += 1;
      }

      // Check data period
      const startDate = new Date(pnlReport?.Header?.StartPeriod);
      const endDate = new Date(pnlReport?.Header?.EndPeriod);
      const monthsInPeriod = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
        (endDate.getMonth() - startDate.getMonth()) + 1;
      
      if (monthsInPeriod >= 6) qualityScore += 1;

      if (qualityScore >= 4) return 'good';
      if (qualityScore >= 2) return 'limited';
      return 'poor';
    } catch (error) {
      console.error('Error assessing data quality:', error);
      return 'poor';
    }
  }

  private calculateAvailableMonths(profitLoss: any): number {
    try {
      const report = profitLoss.QueryResponse?.Report;
      if (!report?.Header) return 0;

      const startDate = new Date(report.Header.StartPeriod);
      const endDate = new Date(report.Header.EndPeriod);
      
      return (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
             (endDate.getMonth() - startDate.getMonth()) + 1;
    } catch (error) {
      console.error('Error calculating available months:', error);
      return 0;
    }
  }
}