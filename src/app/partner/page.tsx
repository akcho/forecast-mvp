'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export default function PartnerView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<{
    profitLoss: any;
    balanceSheet: any;
    cashFlow: any;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const client = new QuickBooksClient();
        
        // Fetch all available reports
        const [profitLoss, balanceSheet, cashFlow] = await Promise.all([
          client.getProfitAndLoss(),
          client.getBalanceSheet(),
          client.getCashFlow()
        ]);

        setReports({ profitLoss, balanceSheet, cashFlow });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <Text>Loading QuickBooks data...</Text>
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

  if (!reports) return null;

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <div className="mb-6">
        <Title>QuickBooks API Integration Demo</Title>
        <Text>Successfully pulling data from all major financial reports</Text>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <Title>Profit & Loss</Title>
          <Text>Available data points: {Object.keys(reports.profitLoss).length}</Text>
          <div className="mt-4">
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              {JSON.stringify(reports.profitLoss, null, 2)}
            </pre>
          </div>
        </Card>

        <Card>
          <Title>Balance Sheet</Title>
          <Text>Available data points: {Object.keys(reports.balanceSheet).length}</Text>
          <div className="mt-4">
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              {JSON.stringify(reports.balanceSheet, null, 2)}
            </pre>
          </div>
        </Card>

        <Card>
          <Title>Cash Flow</Title>
          <Text>Available data points: {Object.keys(reports.cashFlow).length}</Text>
          <div className="mt-4">
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              {JSON.stringify(reports.cashFlow, null, 2)}
            </pre>
          </div>
        </Card>
      </div>
    </main>
  );
} 