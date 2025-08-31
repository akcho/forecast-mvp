import React from 'react';

interface ColData {
  value: string;
  id?: string;
}

interface PnLRow {
  type: string;
  group?: string;
  Header?: {
    ColData: ColData[];
  };
  Rows?: {
    Row: PnLRow[];
  };
  Summary?: {
    ColData: ColData[];
  };
  ColData?: ColData[];
}

interface PnlTableProps {
  report: {
    Header: {
      Time: string;
      ReportName: string;
      ReportBasis: string;
      StartPeriod: string;
      EndPeriod: string;
      Currency: string;
      Columns: {
        Column: ColData[];
      };
    };
    Columns: {
      Column: Array<{ ColTitle: string; ColType: string; }>;
    };
    Rows: {
      Row: PnLRow[];
    };
  };
}

const formatCurrency = (value: string) => {
  const amount = parseFloat(value);
  if (isNaN(amount) || amount === 0) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getFriendlyReportTitle = (reportName: string) => {
  switch (reportName) {
    case 'ProfitAndLoss':
      return 'Profit & Loss Statement';
    case 'BalanceSheet':
      return 'Balance Sheet';
    case 'CashFlow':
      return 'Cash Flow Statement';
    default:
      return reportName;
  }
};

const renderRow = (row: PnLRow, level = 0, columns: any[], rowIndex = 0, parentKey = ''): JSX.Element[] => {
  const isSectionHeader = row.type === 'Section' && row.Header;
  const isSummary = !!row.Summary;
  const isDataRow = row.type === 'Data';

  let rowClassName = 'border-b border-gray-100 dark:border-gray-700';
  let textStyle: React.CSSProperties = {
    paddingLeft: `${level * 20}px`,
  };

  const rowData = isDataRow ? row.ColData : isSummary ? row.Summary?.ColData : row.Header?.ColData;
  if (!rowData) return [];
  const label = rowData[0].value;
  const rowKey = `${parentKey}-${rowData[0].id || label || rowIndex}`;

  // Determine total level hierarchy
  const isKeyMetric = row.group === 'GrossProfit' || row.group === 'NetIncome' || row.group === 'NetOperatingIncome';
  const isSubTotal = level > 0 && label?.includes('Total');
  const isSectionTotal = level === 0 && label?.includes('Total') && !isKeyMetric;
  const isSummaryRow = isKeyMetric || isSubTotal || isSectionTotal;

  if (isKeyMetric) {
    // Key business metrics: bold + extra spacing, minimal background
    textStyle.fontWeight = 'bold';
    rowClassName += ' hover:bg-gray-50/50 dark:hover:bg-gray-700/50 border-t-2 border-gray-300 dark:border-gray-600 pt-4';
  } else if (isSectionTotal) {
    // Section totals: bold + subtle spacing
    textStyle.fontWeight = 'bold';
    rowClassName += ' hover:bg-gray-50/50 dark:hover:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 pt-2';
  } else if (isSubTotal) {
    // Sub-totals: semibold only, no background
    textStyle.fontWeight = '600'; // semibold
    rowClassName += ' hover:bg-gray-50/50 dark:hover:bg-gray-700/50';
  } else {
    // Regular rows: minimal styling with subtle hover
    rowClassName += ' hover:bg-gray-50/50 dark:hover:bg-gray-700/50';
  }

  let labelColor = 'text-gray-800 dark:text-gray-200';
  
  // Only color labels for key metrics and critical totals
  if (isKeyMetric) {
    // Key business metrics: Color based on performance
    const totalValueStr = rowData[rowData.length - 1]?.value;
    const isTotalNegative = totalValueStr ? parseFloat(totalValueStr) < 0 : false;
    labelColor = isTotalNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  } else if (isSectionTotal) {
    // Section totals: Subtle coloring for context
    if (row.group === 'Income') {
      labelColor = 'text-green-700 dark:text-green-400';
    } else if (row.group === 'Expenses' || row.group === 'COGS') {
      labelColor = 'text-red-700 dark:text-red-400';
    } else {
      labelColor = 'text-gray-900 dark:text-gray-100';
    }
  } else {
    // Regular items and sub-totals: Neutral
    labelColor = 'text-gray-800 dark:text-gray-200';
  }

  const mainRow = (
    <tr key={rowKey} className={rowClassName}>
      <td className="py-3 px-3">
        <span style={textStyle} className={`${labelColor} ${
          isKeyMetric ? 'text-base font-bold' : 
          isSectionTotal ? 'text-sm font-bold' : 
          isSubTotal ? 'text-sm font-semibold' : 
          'text-sm font-normal'
        }`}>
          {label}
        </span>
      </td>
      {columns.slice(1).map((col, index) => {
        const cellValue = rowData[index + 1]?.value;
        
        if (cellValue === undefined) return <td key={`${rowKey}-cell-${index}`}></td>;

        const numericValue = parseFloat(cellValue);
        const isNegative = numericValue < 0;
        const isZero = numericValue === 0;
        
        let valueColor = 'text-gray-700 dark:text-gray-300'; // Default neutral color for regular data
        
        // Only color meaningful totals and key metrics
        if (isSummaryRow) {
          if (row.group === 'Income') {
            // Total Income: Green if positive, red if negative (unusual)
            valueColor = isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
          } else if (row.group === 'Expenses' || row.group === 'COGS') {
            // Total Expenses/COGS: Red (they're costs)
            valueColor = 'text-red-600 dark:text-red-400';
          } else if (row.group === 'NetIncome' || row.group === 'GrossProfit') {
            // Key metrics: Strong color based on performance
            valueColor = isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
          } else if (isSubTotal && row.group === 'Income') {
            // Sub-totals in income: Green for positive
            valueColor = isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
          } else {
            // Other totals: Neutral
            valueColor = 'text-gray-700 dark:text-gray-300';
          }
        } else {
          // Regular data rows: mostly neutral, except notable exceptions
          if (isZero) {
            valueColor = 'text-gray-400 dark:text-gray-500';
          } else if (row.group === 'Income' && isNegative) {
            // Negative income (like discounts): Show as red
            valueColor = 'text-red-600 dark:text-red-400';
          } else if ((row.group === 'Expenses' || row.group === 'COGS') && !isNegative && numericValue > 0) {
            // Positive expenses: Neutral (expected)
            valueColor = 'text-gray-700 dark:text-gray-300';
          } else {
            // Everything else: Neutral
            valueColor = 'text-gray-700 dark:text-gray-300';
          }
        }
        
        return (
          <td key={`${rowKey}-cell-${index}`} className={`text-right py-3 px-3 font-mono ${valueColor} ${
            isKeyMetric ? 'text-base font-bold' : 
            isSectionTotal ? 'text-sm font-bold' : 
            isSubTotal ? 'text-sm font-semibold' : 
            'text-sm font-normal'
          }`}>
            {formatCurrency(cellValue)}
          </td>
        );
      })}
    </tr>
  );

  const childRows = row.Rows?.Row?.flatMap((subRow, subIndex) => 
    renderRow(subRow, level + (isSectionHeader ? 1 : 0), columns, subIndex, rowKey)
  ) || [];

  return [mainRow, ...childRows];
};

export const PnlTable: React.FC<PnlTableProps> = ({ report }) => {
  if (!report) {
    return <div>No report data available.</div>;
  }

  const { Header, Columns, Rows } = report;

  return (
    <div className="h-[48rem] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{getFriendlyReportTitle(Header.ReportName)}</h2>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <table 
          className="border-collapse bg-white dark:bg-gray-800 w-full" 
          style={{ 
            minWidth: `${220 + (Columns.Column.length - 1) * 110}px`,
            tableLayout: 'fixed'
          }}
        >
          <thead>
            <tr>
              {Columns.Column.map((col, index) => (
                <th
                  key={index}
                  className={`${index === 0 ? 'text-left' : 'text-right'} py-3 px-3 font-bold text-gray-600 dark:text-gray-400`}
                  style={{ width: index === 0 ? 220 : 110 }}
                >
                  {col.ColTitle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Rows.Row.flatMap((row, rowIndex) => renderRow(row, 0, Columns.Column, rowIndex))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 