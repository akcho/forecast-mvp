'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text, Select, SelectItem } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';

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
        <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
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

      <div className="grid grid-cols-1 gap-6">
        {/* Summary Card */}
        <Card>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Text>Total Income</Text>
              <Title className="text-green-600">
                ${report?.Rows?.Row?.find((row: any) => row.type === 'Section' && row.Header?.ColData[0].value === 'Income')?.Summary?.ColData[1].value || '0.00'}
              </Title>
            </div>
            <div>
              <Text>Total Expenses</Text>
              <Title className="text-red-600">
                ${report?.Rows?.Row?.find((row: any) => row.type === 'Section' && row.Header?.ColData[0].value === 'Expenses')?.Summary?.ColData[1].value || '0.00'}
              </Title>
            </div>
            <div>
              <Text>Net Income</Text>
              <Title className={parseFloat(report?.Rows?.Row?.find((row: any) => row.type === 'Section' && row.Header?.ColData[0].value === 'Net Income')?.Summary?.ColData[1].value || '0') >= 0 ? 'text-green-600' : 'text-red-600'}>
                ${report?.Rows?.Row?.find((row: any) => row.type === 'Section' && row.Header?.ColData[0].value === 'Net Income')?.Summary?.ColData[1].value || '0.00'}
              </Title>
            </div>
          </div>
        </Card>

        {/* Income Section */}
        <Card>
          <Title>Income</Title>
          <div className="mt-4">
            {report?.Rows?.Row?.filter((row: any) => 
              row.type === 'Data' && 
              row.Group === 'Income'
            ).map((row: any, index: number) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <Text>{row.ColData[0].value}</Text>
                <Text className="text-green-600">${row.ColData[1].value}</Text>
              </div>
            ))}
          </div>
        </Card>

        {/* Expenses Section */}
        <Card>
          <Title>Expenses</Title>
          <div className="mt-4">
            {report?.Rows?.Row?.filter((row: any) => 
              row.type === 'Data' && 
              row.Group === 'Expenses'
            ).map((row: any, index: number) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <Text>{row.ColData[0].value}</Text>
                <Text className="text-red-600">${row.ColData[1].value}</Text>
              </div>
            ))}
          </div>
        </Card>

        {/* Additional Metrics */}
        <Card>
          <Title>Key Metrics</Title>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <Text>Gross Profit Margin</Text>
              <Title>
                {(() => {
                  const grossProfit = parseFloat(report?.Rows?.Row?.find((row: any) => row.type === 'Section' && row.Header?.ColData[0].value === 'Gross Profit')?.Summary?.ColData[1].value || '0');
                  const totalIncome = parseFloat(report?.Rows?.Row?.find((row: any) => row.type === 'Section' && row.Header?.ColData[0].value === 'Income')?.Summary?.ColData[1].value || '0');
                  return totalIncome ? ((grossProfit / totalIncome) * 100).toFixed(1) + '%' : '0%';
                })()}
              </Title>
            </div>
            <div>
              <Text>Operating Margin</Text>
              <Title>
                {(() => {
                  const operatingIncome = parseFloat(report?.Rows?.Row?.find((row: any) => row.type === 'Section' && row.Header?.ColData[0].value === 'Operating Income')?.Summary?.ColData[1].value || '0');
                  const totalIncome = parseFloat(report?.Rows?.Row?.find((row: any) => row.type === 'Section' && row.Header?.ColData[0].value === 'Income')?.Summary?.ColData[1].value || '0');
                  return totalIncome ? ((operatingIncome / totalIncome) * 100).toFixed(1) + '%' : '0%';
                })()}
              </Title>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 