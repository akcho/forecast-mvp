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

  const rowStyle: React.CSSProperties = {
    paddingLeft: `${level * 20}px`,
  };

  let rowClassName = 'border-b border-gray-100 hover:bg-gray-50';
  let textStyle: React.CSSProperties = {};

  const rowData = isDataRow ? row.ColData : isSummary ? row.Summary?.ColData : row.Header?.ColData;
  if (!rowData) return [];
  const label = rowData[0].value;
  const rowKey = `${parentKey}-${rowData[0].id || label || rowIndex}`;

  const isSummaryRow = label?.includes('Total') || row.group === 'GrossProfit' || row.group === 'NetIncome' || row.group === 'NetOperatingIncome';

  if (isSummaryRow) {
    textStyle.fontWeight = 'bold';
    rowClassName += ' bg-gray-50';
  }
  
  if ((row.group === 'GrossProfit' || row.group === 'NetIncome') && rowIndex > 0) {
    rowClassName += ' border-t-2 border-gray-300';
  }

  let labelColor = 'text-gray-800';
  if (isSummaryRow) {
    if (row.group === 'Income') {
      labelColor = 'text-green-600';
    } else if (row.group === 'Expenses' || row.group === 'COGS') {
      labelColor = 'text-red-600';
    } else if (row.group === 'NetIncome' || row.group === 'GrossProfit') {
      const totalValueStr = rowData[rowData.length - 1]?.value;
      const isTotalNegative = totalValueStr ? parseFloat(totalValueStr) < 0 : false;
      labelColor = isTotalNegative ? 'text-red-600' : 'text-green-600';
    } else {
      labelColor = 'text-gray-900';
    }
  }

  const mainRow = (
    <tr key={rowKey} className={rowClassName}>
      <td style={rowStyle} className="py-2 px-2">
        <span style={textStyle} className={labelColor}>
          {label}
        </span>
      </td>
      {columns.slice(1).map((col, index) => {
        const cellValue = rowData[index + 1]?.value;
        
        if (cellValue === undefined) return <td key={`${rowKey}-cell-${index}`}></td>;

        const numericValue = parseFloat(cellValue);
        const isNegative = numericValue < 0;
        const isZero = numericValue === 0;
        
        let valueColor = 'text-gray-900';
        
        // Apply specific group-based coloring first
        if (row.group === 'Income') {
          valueColor = 'text-green-600';
        } else if (row.group === 'Expenses' || row.group === 'COGS') {
          valueColor = 'text-red-600';
        } else if (row.group === 'NetIncome' || row.group === 'GrossProfit') {
          valueColor = isNegative ? 'text-red-600' : 'text-green-600';
        } else {
          // For all other rows, apply general positive/negative coloring
          if (isZero) {
            valueColor = 'text-gray-500';
          } else if (isNegative) {
            valueColor = 'text-red-600';
          } else {
            // Positive values - use green for most financial metrics
            valueColor = 'text-green-600';
          }
        }
        
        return (
          <td key={`${rowKey}-cell-${index}`} className={`text-right py-2 px-2 font-mono ${valueColor}`}>
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
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">{getFriendlyReportTitle(Header.ReportName)}</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white" style={{ minWidth: `${Math.max(800, Columns.Column.length * 120)}px` }}>
          <thead>
            <tr>
              {Columns.Column.map((col, index) => (
                <th
                  key={index}
                  className={`${index === 0 ? 'text-left' : 'text-right'} py-3 px-2 font-bold text-gray-600`}
                  style={{ minWidth: index === 0 ? 220 : 140 }}
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