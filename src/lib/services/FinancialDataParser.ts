/**
 * FinancialDataParser - Transforms QuickBooks report data into structured monthly datasets
 * Extracts the parsing logic from PnlTable.tsx for server-side use and modeling
 */

import { MonthlyValue, MonthlyFinancialLine, ParsedProfitLoss } from '../types/financialModels';

interface QuickBooksReport {
  Header: {
    Time: string;
    ReportName: string;
    ReportBasis?: string;
    Currency: string;
    StartPeriod: string;
    EndPeriod: string;
    SummarizeColumnsBy?: string;
  };
  Columns: {
    Column: Array<{
      ColTitle: string;
      ColType: string;
    }>;
  };
  Rows: {
    Row: Array<any>; // Complex nested structure from QB
  };
}

export class FinancialDataParser {
  
  /**
   * Parse QuickBooks P&L report into structured monthly data
   */
  parseMonthlyProfitLoss(report: QuickBooksReport): ParsedProfitLoss {
    console.log('🔄 Parsing monthly P&L data...');
    
    // Extract month names from columns (skip first column which is account names)
    const monthColumns = report.Columns.Column.slice(1).map(col => col.ColTitle).filter(title => title !== 'Total');
    const months = monthColumns.map(monthStr => this.parseMonthDate(monthStr));
    
    console.log(`📊 Found ${monthColumns.length} month columns:`, monthColumns);
    
    // Parse revenue and expense sections
    const revenueLines: MonthlyFinancialLine[] = [];
    const expenseLines: MonthlyFinancialLine[] = [];
    
    let revenueTotals: MonthlyValue[] = [];
    let expenseTotals: MonthlyValue[] = [];
    let netIncomeValues: MonthlyValue[] = [];
    
    // Process each row in the QB report
    this.processRows(report.Rows.Row, monthColumns, months, revenueLines, expenseLines);
    
    // Calculate totals from parsed lines
    revenueTotals = this.calculateMonthlyTotals(revenueLines, months, 'revenue');
    expenseTotals = this.calculateMonthlyTotals(expenseLines, months, 'expense');
    netIncomeValues = this.calculateNetIncome(revenueTotals, expenseTotals);
    
    const result: ParsedProfitLoss = {
      period: {
        start: new Date(report.Header.StartPeriod),
        end: new Date(report.Header.EndPeriod),
        months: monthColumns
      },
      revenue: {
        lines: revenueLines,
        monthlyTotals: revenueTotals,
        grandTotal: revenueTotals.reduce((sum, m) => sum + m.value, 0)
      },
      expenses: {
        lines: expenseLines,
        monthlyTotals: expenseTotals,
        grandTotal: expenseTotals.reduce((sum, m) => sum + m.value, 0)
      },
      netIncome: {
        monthlyValues: netIncomeValues,
        total: netIncomeValues.reduce((sum, m) => sum + m.value, 0)
      },
      metadata: {
        currency: report.Header.Currency,
        reportBasis: report.Header.ReportBasis || 'Unknown',
        columnsCount: report.Columns.Column.length,
        linesCount: revenueLines.length + expenseLines.length
      }
    };
    
    console.log(`✅ Parsed P&L: ${result.revenue.lines.length} revenue lines, ${result.expenses.lines.length} expense lines`);
    
    return result;
  }
  
  private processRows(
    rows: any[], 
    monthColumns: string[], 
    months: Date[],
    revenueLines: MonthlyFinancialLine[],
    expenseLines: MonthlyFinancialLine[],
    level = 0,
    currentSection: 'revenue' | 'expense' | 'other' = 'revenue'
  ) {
    for (const row of rows) {
      // Determine section based on QB row groups
      if (row.group === 'Income') {
        currentSection = 'revenue';
      } else if (row.group === 'Expenses') {
        currentSection = 'expense';
      }
      
      // Process data rows
      if (row.type === 'Data' && row.ColData) {
        const line = this.parseDataRow(row, monthColumns, months, level, currentSection);
        if (line) {
          if (currentSection === 'revenue') {
            revenueLines.push(line);
          } else if (currentSection === 'expense') {
            expenseLines.push(line);
          }
        }
      }
      
      // Process section headers and summaries
      if (row.type === 'Section' && row.Summary?.ColData) {
        const line = this.parseDataRow({ ColData: row.Summary.ColData }, monthColumns, months, level, 'summary');
        if (line) {
          line.type = 'summary';
          if (currentSection === 'revenue') {
            revenueLines.push(line);
          } else if (currentSection === 'expense') {
            expenseLines.push(line);
          }
        }
      }
      
      // Recursively process nested rows
      if (row.Rows?.Row) {
        this.processRows(row.Rows.Row, monthColumns, months, revenueLines, expenseLines, level + 1, currentSection);
      }
    }
  }
  
  private parseDataRow(
    row: any, 
    monthColumns: string[], 
    months: Date[], 
    level: number,
    type: 'revenue' | 'expense' | 'summary'
  ): MonthlyFinancialLine | null {
    if (!row.ColData || row.ColData.length === 0) return null;
    
    const accountName = row.ColData[0].value || '';
    const accountId = row.ColData[0].id;
    
    // Skip empty rows
    if (!accountName.trim()) return null;
    
    // Parse monthly values (skip first column which is account name)
    const monthlyValues: MonthlyValue[] = [];
    let total = 0;
    
    for (let i = 1; i < row.ColData.length - 1; i++) { // -1 to exclude Total column
      const valueStr = row.ColData[i]?.value || '0';
      const value = this.parseAmount(valueStr);
      
      if (i - 1 < months.length) {
        monthlyValues.push({
          month: monthColumns[i - 1],
          value,
          date: months[i - 1]
        });
        total += value;
      }
    }
    
    return {
      accountName,
      accountId,
      monthlyValues,
      total,
      level,
      type
    };
  }
  
  private parseAmount(valueStr: string): number {
    if (!valueStr || valueStr === '-' || valueStr.trim() === '') return 0;
    
    // Remove formatting and parse
    const cleanStr = valueStr.replace(/[,$\s()]/g, '');
    const isNegative = valueStr.includes('(') || valueStr.includes('-');
    const amount = parseFloat(cleanStr) || 0;
    
    return isNegative ? -amount : amount;
  }
  
  private parseMonthDate(monthStr: string): Date {
    // Handle formats like "May 2025", "Jun 2025"
    if (monthStr.includes(' ')) {
      const [month, year] = monthStr.split(' ');
      return new Date(`${month} 1, ${year}`);
    }
    
    // Fallback to current date
    return new Date();
  }
  
  private calculateMonthlyTotals(
    lines: MonthlyFinancialLine[], 
    months: Date[],
    type: 'revenue' | 'expense'
  ): MonthlyValue[] {
    const totals: MonthlyValue[] = [];
    
    for (let i = 0; i < months.length; i++) {
      const monthTotal = lines
        .filter(line => line.type !== 'summary') // Exclude summary lines to avoid double counting
        .reduce((sum, line) => {
          return sum + (line.monthlyValues[i]?.value || 0);
        }, 0);
      
      totals.push({
        month: months[i].toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: monthTotal,
        date: months[i]
      });
    }
    
    return totals;
  }
  
  private calculateNetIncome(revenueTotals: MonthlyValue[], expenseTotals: MonthlyValue[]): MonthlyValue[] {
    const netIncome: MonthlyValue[] = [];
    
    for (let i = 0; i < revenueTotals.length; i++) {
      const revenue = revenueTotals[i]?.value || 0;
      const expenses = expenseTotals[i]?.value || 0;
      
      netIncome.push({
        month: revenueTotals[i].month,
        value: revenue - expenses,
        date: revenueTotals[i].date
      });
    }
    
    return netIncome;
  }
}