/**
 * DataValidator - Validates completeness and consistency of financial data
 * Used to ensure data quality for Sprint 2 forecasting models
 */

import { ParsedProfitLoss, DataValidationResult } from '../types/financialModels';

export class DataValidator {
  
  /**
   * Validate parsed P&L data for completeness and mathematical consistency
   */
  validateProfitLoss(data: ParsedProfitLoss): DataValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check period completeness
    const expectedMonths = this.calculateExpectedMonths(data.period.start, data.period.end);
    const actualMonths = data.period.months.length;
    const completeness = actualMonths / expectedMonths;
    
    if (completeness < 1) {
      warnings.push(`Missing ${expectedMonths - actualMonths} months of data`);
    }
    
    // Check for months with no data
    const monthsMissing: string[] = [];
    data.revenue.monthlyTotals.forEach(month => {
      if (month.value === 0 && data.expenses.monthlyTotals.find(e => e.month === month.month)?.value === 0) {
        monthsMissing.push(month.month);
      }
    });
    
    if (monthsMissing.length > 0) {
      warnings.push(`Months with no activity: ${monthsMissing.join(', ')}`);
    }
    
    // Mathematical consistency checks
    const revenueCalculationCheck = this.validateTotalCalculation(data.revenue.lines, data.revenue.grandTotal, 'revenue');
    const expenseCalculationCheck = this.validateTotalCalculation(data.expenses.lines, data.expenses.grandTotal, 'expense');
    const netIncomeCheck = Math.abs((data.revenue.grandTotal - data.expenses.grandTotal) - data.netIncome.total) < 0.01;
    
    if (!revenueCalculationCheck.isValid) {
      errors.push(`Revenue calculation error: Expected ${revenueCalculationCheck.expected}, got ${revenueCalculationCheck.actual}`);
    }
    
    if (!expenseCalculationCheck.isValid) {
      errors.push(`Expense calculation error: Expected ${expenseCalculationCheck.expected}, got ${expenseCalculationCheck.actual}`);
    }
    
    if (!netIncomeCheck) {
      errors.push(`Net income calculation error: Revenue (${data.revenue.grandTotal}) - Expenses (${data.expenses.grandTotal}) ≠ Net Income (${data.netIncome.total})`);
    }
    
    // Data quality checks
    if (data.revenue.lines.length === 0) {
      errors.push('No revenue lines found');
    }
    
    if (data.expenses.lines.length === 0) {
      warnings.push('No expense lines found (unusual for most businesses)');
    }
    
    // Check for reasonable business metrics
    if (data.revenue.grandTotal <= 0) {
      warnings.push('Total revenue is zero or negative');
    }
    
    if (data.expenses.grandTotal <= 0) {
      warnings.push('Total expenses are zero or negative (unusual)');
    }
    
    const mathematicalConsistency = revenueCalculationCheck.isValid && expenseCalculationCheck.isValid && netIncomeCheck;
    const isValid = errors.length === 0 && completeness >= 0.8; // At least 80% data completeness required
    
    return {
      isValid,
      completeness,
      monthsWithData: actualMonths,
      monthsMissing,
      mathematicalConsistency,
      warnings,
      errors
    };
  }
  
  private calculateExpectedMonths(startDate: Date, endDate: Date): number {
    const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (endDate.getMonth() - startDate.getMonth()) + 1;
    return Math.max(1, monthDiff);
  }
  
  private validateTotalCalculation(lines: any[], actualTotal: number, type: string): { isValid: boolean; expected: number; actual: number } {
    // Sum non-summary lines to avoid double counting
    const expectedTotal = lines
      .filter(line => line.type !== 'summary')
      .reduce((sum, line) => sum + line.total, 0);
    
    const isValid = Math.abs(expectedTotal - actualTotal) < 0.01; // Allow for small rounding differences
    
    return {
      isValid,
      expected: expectedTotal,
      actual: actualTotal
    };
  }
  
  /**
   * Generate data quality report with actionable insights
   */
  generateDataQualityReport(validationResult: DataValidationResult): string {
    let report = `📊 **Data Quality Report**\n\n`;
    
    report += `**Overall Status:** ${validationResult.isValid ? '✅ Valid' : '❌ Issues Found'}\n`;
    report += `**Completeness:** ${(validationResult.completeness * 100).toFixed(1)}% (${validationResult.monthsWithData} months)\n`;
    report += `**Mathematical Consistency:** ${validationResult.mathematicalConsistency ? '✅ Consistent' : '❌ Inconsistent'}\n\n`;
    
    if (validationResult.errors.length > 0) {
      report += `**❌ Critical Errors:**\n`;
      validationResult.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }
    
    if (validationResult.warnings.length > 0) {
      report += `**⚠️ Warnings:**\n`;
      validationResult.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }
    
    if (validationResult.monthsMissing.length > 0) {
      report += `**📅 Missing Data:**\n`;
      report += `Months with no activity: ${validationResult.monthsMissing.join(', ')}\n\n`;
    }
    
    if (validationResult.isValid) {
      report += `**✅ Data Ready:** This dataset is suitable for forecasting and analysis.`;
    } else {
      report += `**⚠️ Action Required:** Please address the errors above before proceeding with forecasting.`;
    }
    
    return report;
  }
}