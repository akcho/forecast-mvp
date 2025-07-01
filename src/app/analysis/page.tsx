'use client';

import { useState, useEffect, use } from 'react';
import { Card, Title, Text, Select, SelectItem, Grid, Col, Badge, Button, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { useSearchParams } from 'next/navigation';
import { PnlTable } from '.';

// ... (interfaces for PnLRow, etc. if needed)

export default function AnalysisPage() {
  const [activeStatement, setActiveStatement] = useState('profitLoss');
  const [timePeriod, setTimePeriod] = useState('3months');
  const [aiPanelMinimized, setAiPanelMinimized] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // This effect handles the initial connection check and OAuth redirect
    const status = searchParams.get('quickbooks');
    const realmId = searchParams.get('realm_id');

    if (quickBooksStore.getAccessToken()) {
      console.log('Already connected to QuickBooks');
      setIsConnected(true);
    } else if (status === 'connected' && realmId) {
      console.log('Successfully connected to QuickBooks, fetching data...');
      quickBooksStore.setRealmId(realmId);
      setIsConnected(true);
    } else {
      console.log('Not connected to QuickBooks');
      setIsConnected(false);
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isConnected) return; // Don't fetch if not connected

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = new QuickBooksClient();
        
        // Always set endDate to the last day of the previous month
        const today = new Date();
        const endDate = new Date(today.getFullYear(), today.getMonth(), 0); // 0th day = last day of previous month
        const endDateStr = endDate.toISOString().split('T')[0];

        // Set startDate to N months before endDate, on the 1st
        let months = 3;
        if (timePeriod === '6months') months = 6;
        if (timePeriod === '12months') months = 12;
        const startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - (months - 1));
        startDate.setDate(1);
        const startDateStr = startDate.toISOString().split('T')[0];

        const params: Record<string, string> = {
          start_date: startDateStr,
          end_date: endDateStr,
          summarize_column_by: 'Month'
        };

        let fetchedReport;
        if (activeStatement === 'profitLoss') {
          fetchedReport = await client.getProfitAndLoss(params);
        }
        // Add else if for other statements later
        
        console.log('Fetched Report:', fetchedReport);
        setReport(fetchedReport?.QueryResponse?.Report);

      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [timePeriod, activeStatement, isConnected]);

  const handleQuickBooksConnect = () => {
    setLoading(true);
    window.location.href = '/api/quickbooks/auth';
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Title>Connect to QuickBooks</Title>
          <Text className="mt-2 mb-6">
            To analyze your financial data, please connect your QuickBooks account.
          </Text>
          <Button onClick={handleQuickBooksConnect} loading={loading}>
            Connect to QuickBooks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Financial Analysis</h1>
          <Text className="text-gray-600">Review your financial statements</Text>
        </div>
        <div className="flex gap-4">
          <Select value={timePeriod} onValueChange={setTimePeriod} className="w-48">
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">Last 12 Months</SelectItem>
          </Select>
          <Button onClick={() => setAiPanelMinimized(!aiPanelMinimized)}>
            {aiPanelMinimized ? 'Show AI' : 'Hide AI'}
          </Button>
        </div>
      </div>
      <Grid numItems={aiPanelMinimized ? 1 : 3} className="gap-6">
        <Col numColSpan={aiPanelMinimized ? 1 : 2}>
          <TabGroup>
            <TabList>
              <Tab onClick={() => setActiveStatement('profitLoss')}>P&L Statement</Tab>
              <Tab onClick={() => setActiveStatement('balanceSheet')} disabled>Balance Sheet</Tab>
              <Tab onClick={() => setActiveStatement('cashFlow')} disabled>Cash Flow</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                {loading ? (
                  <Text>Loading...</Text>
                ) : error ? (
                  <Text color="red">{error}</Text>
                ) : report ? (
                  <PnlTable report={report} />
                ) : (
                  <Text>No report data found.</Text>
                )}
              </TabPanel>
              <TabPanel>
                {/* Balance Sheet Table */}
              </TabPanel>
              <TabPanel>
                {/* Cash Flow Table */}
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </Col>
        {!aiPanelMinimized && (
          <Col>
            <Card>
              <Title>AI Financial Analysis</Title>
              <Text>AI summary, insights, and recommendations will go here.</Text>
            </Card>
          </Col>
        )}
      </Grid>
    </div>
  );
}
