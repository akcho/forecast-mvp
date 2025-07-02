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

const renderRow = (row: PnLRow, level = 0, columns: any[]): JSX.Element | null => {
  const isSectionHeader = row.type === 'Section' && row.Header;
  const isSummary = !!row.Summary;
  const isDataRow = row.type === 'Data';

  const rowStyle: React.CSSProperties = {
    paddingLeft: `${level * 20}px`,
  };

  let rowClassName = 'border-b border-gray-100 hover:bg-gray-50';
  let textStyle: React.CSSProperties = {};

  const rowData = isDataRow ? row.ColData : isSummary ? row.Summary?.ColData : row.Header?.ColData;
  if (!rowData) return null;
  const label = rowData[0].value;

  const isSummaryRow = label?.includes('Total') || row.group === 'GrossProfit' || row.group === 'NetIncome' || row.group === 'NetOperatingIncome';

  if (isSummaryRow) {
    textStyle.fontWeight = 'bold';
    rowClassName += ' bg-gray-50';
  }
  
  if(row.group === 'GrossProfit' || row.group === 'NetIncome'){
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

  return (
    <>
      <tr key={rowData[0].id || label} className={rowClassName}>
        <td style={rowStyle} className="py-2 px-2">
          <span style={textStyle} className={labelColor}>
            {label}
          </span>
        </td>
        {columns.slice(1).map((col, index) => {
          const cellValue = rowData[index + 1]?.value;
          
          if (cellValue === undefined) return <td key={index}></td>;

          const isNegative = parseFloat(cellValue) < 0;
          let valueColor = 'text-gray-900';
          
          if (row.group === 'Income') {
            valueColor = 'text-green-600';
          } else if (row.group === 'Expenses' || row.group === 'COGS') {
            valueColor = 'text-red-600';
          } else if (row.group === 'NetIncome' || row.group === 'GrossProfit') {
            valueColor = isNegative ? 'text-red-600' : 'text-green-600';
          }
          
          return (
            <td key={index} className={`text-right py-2 px-2 font-mono ${valueColor}`}>
              {formatCurrency(cellValue)}
            </td>
          );
        })}
      </tr>
      {row.Rows?.Row?.map((subRow) => renderRow(subRow, level + (isSectionHeader ? 1 : 0), columns))}
    </>
  );
};

export const PnlTable: React.FC<PnlTableProps> = ({ report }) => {
  if (!report) {
    return <div>No report data available.</div>;
  }

  const { Header, Columns, Rows } = report;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">{Header.ReportName}</h2>
      <p className="text-sm text-gray-500 mb-4">
        {Header.StartPeriod} - {Header.EndPeriod}
      </p>
      <div
        className="overflow-x-scroll overflow-y-auto max-w-none custom-scrollbar"
        style={{ maxHeight: '70vh', minHeight: 0 }}
      >
        <table className="table-fixed" style={{ minWidth: 1200 }}>
          <thead>
            <tr className="border-b-2 border-gray-200">
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
            {Rows.Row.map((row) => renderRow(row, 0, Columns.Column))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 