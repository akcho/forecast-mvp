'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { Card, Title, Text, Select, SelectItem, Grid, Col, Badge, Button, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { useSearchParams } from 'next/navigation';
import { PnlTable } from '.';
import { QuickBooksConnectionManager } from '@/components/QuickBooksConnectionManager';

// ... (interfaces for PnLRow, etc. if needed)

const ChatPanel = dynamic(() => import('@/components/ChatPanel'), {
  ssr: false,
  loading: () => <div className="p-4">Loading AI assistant...</div>,
});

function AnalysisContent() {
  const [activeStatement, setActiveStatement] = useState('profitLoss');
  const [timePeriod, setTimePeriod] = useState('3months');
  const [aiPanelMinimized, setAiPanelMinimized] = useState(false);
  const [reports, setReports] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<{ [key: string]: string | null }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [hasSharedConnection, setHasSharedConnection] = useState(false);
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
      console.log('Not connected to QuickBooks, checking for shared connection...');
      checkSharedConnection();
    }
  }, [searchParams]);

  const checkSharedConnection = async () => {
    try {
      console.log('Checking for shared connection...');
      const response = await fetch('/api/quickbooks/share-connection');
      const data = await response.json();
      console.log('Shared connection response:', data);
      
      if (data.hasSharedConnection) {
        console.log('Found shared QuickBooks connection');
        setHasSharedConnection(true);
        setIsConnected(true);
        // Force the analysis view to show
        console.log('Setting isConnected to true for shared connection');
      } else {
        console.log('No shared connection found');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking shared connection:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (!isConnected) return;

    const fetchAllReports = async () => {
      setLoading({ profitLoss: true, balanceSheet: true, cashFlow: true });
      setError({ profitLoss: null, balanceSheet: null, cashFlow: null });
      try {
        const client = new QuickBooksClient();
        const today = new Date();
        // Calculate end date (last day of previous month)
        const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        const endDateStr = endDate.toISOString().split('T')[0];
        // Calculate start date based on time period
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
          summarize_column_by: 'Month',
        };
        // Fetch all three reports in parallel
        const [profitLoss, balanceSheet, cashFlow] = await Promise.all([
          client.getProfitAndLoss(params),
          client.getBalanceSheet(params),
          client.getCashFlow(params),
        ]);
        setReports({
          profitLoss: profitLoss?.QueryResponse?.Report,
          balanceSheet: balanceSheet?.QueryResponse?.Report,
          cashFlow: cashFlow?.QueryResponse?.Report,
        });
      } catch (e) {
        setError({
          profitLoss: e instanceof Error ? e.message : 'An unknown error occurred.',
          balanceSheet: e instanceof Error ? e.message : 'An unknown error occurred.',
          cashFlow: e instanceof Error ? e.message : 'An unknown error occurred.',
        });
      } finally {
        setLoading({ profitLoss: false, balanceSheet: false, cashFlow: false });
      }
    };

    fetchAllReports();
  }, [timePeriod, isConnected]);

  useEffect(() => {
    console.log('State changed - isConnected:', isConnected, 'hasSharedConnection:', hasSharedConnection, 'activeStatement:', activeStatement);
  }, [isConnected, hasSharedConnection, activeStatement]);

  if (!isConnected) {
    console.log('Not connected, showing connection manager. isConnected:', isConnected, 'hasSharedConnection:', hasSharedConnection);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <QuickBooksConnectionManager />
      </div>
    );
  }

  console.log('Connected, showing analysis view. isConnected:', isConnected, 'hasSharedConnection:', hasSharedConnection);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Financial Analysis</h1>
          <Text className="text-gray-600">
            {hasSharedConnection ? 'Using shared QuickBooks connection' : 'Review your financial statements'}
          </Text>
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
      <TabGroup>
        <TabList className="border-b-0">
          <Tab onClick={() => setActiveStatement('profitLoss')}>P&L Statement</Tab>
          <Tab onClick={() => setActiveStatement('balanceSheet')}>Balance Sheet</Tab>
          <Tab onClick={() => setActiveStatement('cashFlow')}>Cash Flow</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Grid numItems={aiPanelMinimized ? 1 : 3} className="gap-6 items-stretch pb-4 border-none">
              <Col numColSpan={aiPanelMinimized ? 1 : 2} className="flex flex-col">
                <div className="flex-1 flex flex-col border border-gray-200 rounded-lg shadow bg-white">
                  {loading['profitLoss'] ? (
                    <Text>Loading...</Text>
                  ) : error['profitLoss'] ? (
                    <Text color="red">{error['profitLoss']}</Text>
                  ) : reports['profitLoss'] ? (
                    <PnlTable report={reports['profitLoss']} />
                  ) : (
                    <Text>No report data found.</Text>
                  )}
                </div>
              </Col>
              {!aiPanelMinimized && (
                <Col className="flex flex-col">
                  <Card className="h-full flex flex-col justify-start border border-gray-200 rounded-lg shadow bg-white">
                    <Title>AI Financial Analysis</Title>
                    <Suspense fallback={<div className="p-4">Loading AI assistant...</div>}>
                      <ChatPanel 
                        currentReports={{
                          profitLoss: reports['profitLoss'],
                          balanceSheet: reports['balanceSheet'],
                          cashFlow: reports['cashFlow']
                        }}
                        timePeriod={timePeriod}
                      />
                    </Suspense>
                  </Card>
                </Col>
              )}
            </Grid>
          </TabPanel>
          <TabPanel>
            <Grid numItems={aiPanelMinimized ? 1 : 3} className="gap-6 items-stretch pb-4 border-none">
              <Col numColSpan={aiPanelMinimized ? 1 : 2} className="flex flex-col">
                <div className="flex-1 flex flex-col border border-gray-200 rounded-lg shadow bg-white">
                  {loading['balanceSheet'] ? (
                    <Text>Loading...</Text>
                  ) : error['balanceSheet'] ? (
                    <Text color="red">{error['balanceSheet']}</Text>
                  ) : reports['balanceSheet'] ? (
                    <PnlTable report={reports['balanceSheet']} />
                  ) : (
                    <Text>No report data found.</Text>
                  )}
                </div>
              </Col>
              {!aiPanelMinimized && (
                <Col className="flex flex-col">
                  <Card className="h-full flex flex-col justify-start border border-gray-200 rounded-lg shadow bg-white">
                    <Title>AI Financial Analysis</Title>
                    <Suspense fallback={<div className="p-4">Loading AI assistant...</div>}>
                      <ChatPanel 
                        currentReports={{
                          profitLoss: reports['profitLoss'],
                          balanceSheet: reports['balanceSheet'],
                          cashFlow: reports['cashFlow']
                        }}
                        timePeriod={timePeriod}
                      />
                    </Suspense>
                  </Card>
                </Col>
              )}
            </Grid>
          </TabPanel>
          <TabPanel>
            <Grid numItems={aiPanelMinimized ? 1 : 3} className="gap-6 items-stretch pb-4 border-none">
              <Col numColSpan={aiPanelMinimized ? 1 : 2} className="flex flex-col">
                <div className="flex-1 flex flex-col border border-gray-200 rounded-lg shadow bg-white">
                  {loading['cashFlow'] ? (
                    <Text>Loading...</Text>
                  ) : error['cashFlow'] ? (
                    <Text color="red">{error['cashFlow']}</Text>
                  ) : reports['cashFlow'] ? (
                    <PnlTable report={reports['cashFlow']} />
                  ) : (
                    <Text>No report data found.</Text>
                  )}
                </div>
              </Col>
              {!aiPanelMinimized && (
                <Col className="flex flex-col">
                  <Card className="h-full flex flex-col justify-start border border-gray-200 rounded-lg shadow bg-white">
                    <Title>AI Financial Analysis</Title>
                    <Suspense fallback={<div className="p-4">Loading AI assistant...</div>}>
                      <ChatPanel 
                        currentReports={{
                          profitLoss: reports['profitLoss'],
                          balanceSheet: reports['balanceSheet'],
                          cashFlow: reports['cashFlow']
                        }}
                        timePeriod={timePeriod}
                      />
                    </Suspense>
                  </Card>
                </Col>
              )}
            </Grid>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}
