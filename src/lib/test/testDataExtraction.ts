import { getFinancialInsightsFromReports } from '../data';

// Sample QuickBooks report data structure
const sampleProfitLossReport = {
  Header: {
    ReportName: 'ProfitAndLoss',
    StartPeriod: '2024-01-01',
    EndPeriod: '2024-03-31',
    Currency: 'USD'
  },
  Rows: {
    Row: [
      {
        type: 'Section',
        Header: { ColData: [{ value: 'Income' }] },
        Summary: { ColData: [{ value: 'Income' }, { value: '150000' }] },
        Rows: {
          Row: [
            {
              type: 'Data',
              ColData: [{ value: 'Sales' }, { value: '150000' }]
            }
          ]
        }
      },
      {
        type: 'Section',
        Header: { ColData: [{ value: 'Expenses' }] },
        Summary: { ColData: [{ value: 'Expenses' }, { value: '120000' }] },
        Rows: {
          Row: [
            {
              type: 'Data',
              ColData: [{ value: 'Rent' }, { value: '30000' }]
            },
            {
              type: 'Data',
              ColData: [{ value: 'Salaries' }, { value: '90000' }]
            }
          ]
        }
      },
      {
        type: 'Section',
        Header: { ColData: [{ value: 'Net Income' }] },
        Summary: { ColData: [{ value: 'Net Income' }, { value: '30000' }] }
      }
    ]
  }
};

const sampleBalanceSheetReport = {
  Header: {
    ReportName: 'BalanceSheet',
    StartPeriod: '2024-01-01',
    EndPeriod: '2024-03-31',
    Currency: 'USD'
  },
  Rows: {
    Row: [
      {
        type: 'Section',
        Header: { ColData: [{ value: 'ASSETS' }] },
        Summary: { ColData: [{ value: 'Total Assets' }, { value: '500000' }] },
        Rows: {
          Row: [
            {
              type: 'Section',
              Header: { ColData: [{ value: 'Current Assets' }] },
              Rows: {
                Row: [
                  {
                    type: 'Section',
                    Header: { ColData: [{ value: 'Bank Accounts' }] },
                    Summary: { ColData: [{ value: 'Bank Accounts' }, { value: '100000' }] }
                  }
                ]
              }
            }
          ]
        }
      },
      {
        type: 'Section',
        Header: { ColData: [{ value: 'LIABILITIES AND EQUITY' }] },
        Rows: {
          Row: [
            {
              type: 'Section',
              Header: { ColData: [{ value: 'Total Liabilities' }] },
              Summary: { ColData: [{ value: 'Total Liabilities' }, { value: '200000' }] }
            },
            {
              type: 'Section',
              Header: { ColData: [{ value: 'Total Equity' }] },
              Summary: { ColData: [{ value: 'Total Equity' }, { value: '300000' }] }
            }
          ]
        }
      }
    ]
  }
};

const sampleCashFlowReport = {
  Header: {
    ReportName: 'CashFlow',
    StartPeriod: '2024-01-01',
    EndPeriod: '2024-03-31',
    Currency: 'USD'
  },
  Rows: {
    Row: [
      {
        type: 'Section',
        Header: { ColData: [{ value: 'Operating Activities' }] },
        Summary: { ColData: [{ value: 'Net Cash from Operations' }, { value: '25000' }] }
      },
      {
        type: 'Section',
        Header: { ColData: [{ value: 'Investing Activities' }] },
        Summary: { ColData: [{ value: 'Net Cash from Investing' }, { value: '-5000' }] }
      },
      {
        type: 'Section',
        Header: { ColData: [{ value: 'Financing Activities' }] },
        Summary: { ColData: [{ value: 'Net Cash from Financing' }, { value: '0' }] }
      }
    ]
  }
};

export async function testDataExtraction() {
  try {
    console.log('Testing data extraction functions...');
    
    const insights = await getFinancialInsightsFromReports(
      sampleProfitLossReport,
      sampleBalanceSheetReport,
      sampleCashFlowReport,
      '3months'
    );
    
    console.log('Extracted financial insights:', insights);
    
    // Verify the calculations
    const expectedMonthlyBurnRate = 120000 / 3; // 40000
    const expectedRunway = 100000 / expectedMonthlyBurnRate; // 2.5 months
    
    console.log('Expected monthly burn rate:', expectedMonthlyBurnRate);
    console.log('Expected runway (months):', expectedRunway);
    console.log('Actual monthly burn rate:', insights.monthlyBurnRate);
    console.log('Actual runway (months):', insights.runwayMonths);
    
    if (Math.abs(insights.monthlyBurnRate - expectedMonthlyBurnRate) < 1) {
      console.log('✅ Monthly burn rate calculation is correct');
    } else {
      console.log('❌ Monthly burn rate calculation is incorrect');
    }
    
    if (Math.abs(insights.runwayMonths - expectedRunway) < 0.1) {
      console.log('✅ Runway calculation is correct');
    } else {
      console.log('❌ Runway calculation is incorrect');
    }
    
    return insights;
  } catch (error) {
    console.error('Error testing data extraction:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDataExtraction().catch(console.error);
} 