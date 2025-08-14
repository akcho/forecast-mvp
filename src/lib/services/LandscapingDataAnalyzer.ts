/**
 * Sprint 1: Foundation service to analyze landscaping QB data
 * Tests our assumptions about business complexity detection
 */

import { QuickBooksClient } from '@/lib/quickbooks/client';

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
  private qbClient: QuickBooksClient;

  constructor(qbClient: QuickBooksClient) {
    this.qbClient = qbClient;
  }

  /**
   * Extract comprehensive data from QB for analysis
   */
  async extractComprehensiveData(companyId: string): Promise<LandscapingBusinessData> {
    // Get basic financial reports
    const [profitLoss, balanceSheet] = await Promise.all([
      this.qbClient.getProfitAndLoss(companyId),
      this.qbClient.getBalanceSheet(companyId)
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
    // TODO: Implement A/R extraction
    return 0;
  }

  private extractFixedAssets(balanceSheet: any): number {
    // TODO: Implement fixed assets extraction
    return 0;
  }

  private classifyBusinessType(profitLoss: any, balanceSheet: any): 'service' | 'product' | 'hybrid' {
    // TODO: Implement business type classification
    return 'service'; // Default for landscaping
  }

  private analyzeRevenueConsistency(profitLoss: any): number {
    // TODO: Implement revenue consistency analysis
    return 0.8; // Default high consistency
  }

  private assessDataQuality(profitLoss: any, balanceSheet: any): 'good' | 'limited' | 'poor' {
    // TODO: Implement data quality assessment
    return 'limited'; // Conservative default
  }

  private calculateAvailableMonths(profitLoss: any): number {
    // TODO: Calculate actual months of data
    return 6; // Conservative estimate
  }
}