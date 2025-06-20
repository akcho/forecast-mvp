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
  if (isNaN(amount)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const renderRow = (row: PnLRow, level = 0) => {
  const isHeader = row.type === 'Section' && row.Header;
  const isSummary = row.Summary;
  const isDataRow = row.type === 'Data';

  const rowStyle = {
    paddingLeft: `${level * 20}px`,
  };

  const textStyle: React.CSSProperties = {};
  if (isHeader) {
    textStyle.fontWeight = 'bold';
  }

  const rowData = isDataRow ? row.ColData : isSummary ? row.Summary.ColData : row.Header?.ColData;

  if (!rowData) return null;

  return (
    <>
      <tr key={rowData[0].id || rowData[0].value}>
        <td style={rowStyle}>
          <span style={textStyle}>{rowData[0].value}</span>
        </td>
        {rowData.slice(1).map((cell, index) => (
          <td key={index} className="text-right">
            {formatCurrency(cell.value)}
          </td>
        ))}
      </tr>
      {row.Rows?.Row?.map((subRow, index) => renderRow(subRow, level + 1))}
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
      <table className="w-full">
        <thead>
          <tr>
            {Columns.Column.map((col, index) => (
              <th key={index} className={index === 0 ? 'text-left' : 'text-right'}>
                {col.ColTitle}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Rows.Row.map((row) => renderRow(row))}
        </tbody>
      </table>
    </div>
  );
}; 