'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, Select, SelectItem } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';

interface PnLRow {
  type: string;
  Header?: {
    ColData: Array<{ value: string }>;
  };
  Rows?: {
    Row: Array<PnLRow>;
  };
  Summary?: {
    ColData: Array<{ value: string }>;
  };
  ColData?: Array<{ value: string }>;
  Group?: string;
}

export default function ReportView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [dateRange, setDateRange] = useState('thisMonth');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const client = new QuickBooksClient();
        const profitLoss = await client.getProfitAndLoss();
        console.log('P&L Report:', profitLoss);
        setReport(profitLoss?.QueryResponse?.Report);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching report:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch report');
        setLoading(false);
      }
    };

    fetchReport();
  }, [dateRange]);

  const renderRow = (row: PnLRow, level: number = 0) => {
    if (row.type === 'Section') {
      return (
        <div key={row.Header?.ColData[0].value} className="mt-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <Text className={`font-medium ${level === 0 ? 'text-lg' : ''}`}>
              {row.Header?.ColData[0].value}
            </Text>
            <Text className={`font-medium ${level === 0 ? 'text-lg' : ''}`}>
              ${row.Summary?.ColData[1].value || '0.00'}
            </Text>
          </div>
          {row.Rows?.Row.map((subRow) => renderRow(subRow, level + 1))}
        </div>
      );
    }

    if (row.type === 'Data') {
      return (
        <div key={row.ColData?.[0].value} className="flex justify-between items-center py-2 border-b border-gray-100">
          <Text className={`ml-${level * 4}`}>{row.ColData?.[0].value}</Text>
          <Text className={row.Group === 'Income' ? 'text-green-600' : 'text-red-600'}>
            ${row.ColData?.[1].value || '0.00'}
          </Text>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <Text>Loading financial report...</Text>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-center h-64">
          <Text className="text-red-600 mb-4">{error}</Text>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
          <Text className="text-gray-600">
            {report?.Header?.StartPeriod} to {report?.Header?.EndPeriod}
          </Text>
        </div>
        <Select
          value={dateRange}
          onValueChange={setDateRange}
          className="w-48"
        >
          <SelectItem value="thisMonth">This Month</SelectItem>
          <SelectItem value="lastMonth">Last Month</SelectItem>
          <SelectItem value="thisQuarter">This Quarter</SelectItem>
          <SelectItem value="lastQuarter">Last Quarter</SelectItem>
          <SelectItem value="thisYear">This Year</SelectItem>
          <SelectItem value="lastYear">Last Year</SelectItem>
        </Select>
      </div>

      <Card>
        <div className="space-y-4">
          {report?.Rows?.Row?.map((row: PnLRow) => renderRow(row))}
        </div>
      </Card>

      <div className="mt-4 text-sm text-gray-600">
        <p>Report Basis: {report?.Header?.ReportBasis}</p>
        <p>Currency: {report?.Header?.Currency}</p>
        <p>Generated: {new Date(report?.Header?.Time).toLocaleString()}</p>
      </div>
    </div>
  );
} 