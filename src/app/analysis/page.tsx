'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { Title, Text, Select, SelectItem, Button, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { PnlTable } from '.';
import { QuickBooksLogin } from '@/components/QuickBooksLogin';
import { useSession } from 'next-auth/react';
import { LoadingState, FinancialDataLoading } from '@/components/LoadingSpinner';
import { AppLayout } from '@/components/AppLayout';

const ChatPanel = dynamic(() => import('@/components/ChatPanel'), {
  ssr: false,
  loading: () => <LoadingState type="ai" className="p-4" />,
});

// Add a utility to detect mobile
function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

function AnalysisContent() {
  const [timePeriod, setTimePeriod] = useState('3months');
  const [aiPanelMinimized, setAiPanelMinimized] = useState(false);
  const [activeStatement, setActiveStatement] = useState<'profitLoss' | 'balanceSheet' | 'cashFlow'>('profitLoss');
  const [reports, setReports] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<{ [key: string]: string | null }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { data: session } = useSession();

  // Check connection status when user is authenticated
  useEffect(() => {
    if (session?.user?.dbId) {
      checkConnectionStatus();
    } else if (session === null) {
      // Session loaded but user not authenticated
      setConnectionChecked(true);
    }
  }, [session]);

  const checkConnectionStatus = async () => {
    if (!session?.user?.dbId) return;
    
    try {
      const response = await fetch('/api/quickbooks/status');
      const connectionStatus = await response.json();
      
      if (connectionStatus.hasConnection && connectionStatus.companyConnection) {
        setIsConnected(true);
        setActiveCompanyId(connectionStatus.activeCompanyId!);
        console.log('Found valid company connection:', connectionStatus.companyConnection.id);
      } else {
        setIsConnected(false);
        console.log('No company connection found');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setIsConnected(false);
    } finally {
      setConnectionChecked(true);
    }
  };

  useEffect(() => {
    if (!isConnected || !activeCompanyId) return;

    const fetchAllReports = async () => {
      setLoading({ profitLoss: true, balanceSheet: true, cashFlow: true });
      setError({ profitLoss: null, balanceSheet: null, cashFlow: null });
      
      // Check that we have required session and company data
      if (!session?.user?.dbId || !activeCompanyId) {
        setError({ profitLoss: 'Authentication required', balanceSheet: 'Authentication required', cashFlow: 'Authentication required' });
        setLoading({ profitLoss: false, balanceSheet: false, cashFlow: false });
        return;
      }
      
      try {
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

        console.log('Fetching financial reports:', { startDateStr, endDateStr });

        // Use API routes that handle authentication internally with monthly breakdown
        const [profitLossData, balanceSheetData, cashFlowData] = await Promise.allSettled([
          fetch(`/api/quickbooks/profit-loss?start_date=${startDateStr}&end_date=${endDateStr}&summarize_column_by=Month`).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return res.json();
          }),
          fetch(`/api/quickbooks/balance-sheet?start_date=${startDateStr}&end_date=${endDateStr}&summarize_column_by=Month`).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return res.json();
          }),
          fetch(`/api/quickbooks/cash-flow?start_date=${startDateStr}&end_date=${endDateStr}&summarize_column_by=Month`).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return res.json();
          })
        ]);

        // Process results
        const newReports: { [key: string]: any } = {};
        const newError: { [key: string]: string | null } = {};

        // Process Profit & Loss
        if (profitLossData.status === 'fulfilled') {
          newReports.profitLoss = profitLossData.value.QueryResponse?.Report || profitLossData.value;
          newError.profitLoss = null;
        } else {
          console.error('P&L Error:', profitLossData.reason);
          newError.profitLoss = 'Failed to load Profit & Loss report';
        }

        // Process Balance Sheet
        if (balanceSheetData.status === 'fulfilled') {
          newReports.balanceSheet = balanceSheetData.value.QueryResponse?.Report || balanceSheetData.value;
          newError.balanceSheet = null;
        } else {
          console.error('Balance Sheet Error:', balanceSheetData.reason);
          newError.balanceSheet = 'Failed to load Balance Sheet report';
        }

        // Process Cash Flow
        if (cashFlowData.status === 'fulfilled') {
          newReports.cashFlow = cashFlowData.value.QueryResponse?.Report || cashFlowData.value;
          newError.cashFlow = null;
        } else {
          console.error('Cash Flow Error:', cashFlowData.reason);
          newError.cashFlow = 'Failed to load Cash Flow report';
        }

        setReports(newReports);
        setError(newError);

      } catch (err) {
        console.error('Error fetching reports:', err);
        setError({ 
          profitLoss: 'Failed to load reports', 
          balanceSheet: 'Failed to load reports', 
          cashFlow: 'Failed to load reports' 
        });
      } finally {
        setLoading({ profitLoss: false, balanceSheet: false, cashFlow: false });
      }
    };

    fetchAllReports();
  }, [isConnected, activeCompanyId, timePeriod, session]);

  console.log('Analysis page state:', { isConnected, connectionChecked, activeCompanyId });

  if (!connectionChecked) {
    return <LoadingState type="general" className="p-8" />;
  }

  if (!session?.user) {
    return <QuickBooksLogin onConnectionChange={() => setIsConnected(true)} />;
  }

  if (!isConnected) {
    return <QuickBooksLogin onConnectionChange={() => setIsConnected(true)} />;
  }

  console.log('Connected, showing analysis view. isConnected:', isConnected);

  // MOBILE: Show only the chat panel, full screen (without sidebar)
  if (isMobile) {
    const reportsLoaded = reports['profitLoss'] && reports['balanceSheet'] && reports['cashFlow'];
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        <div className="flex-shrink-0 p-4 border-b text-lg font-bold">AI Assistant</div>
        <div className="flex-1 overflow-y-auto">
          {!reportsLoaded ? (
            <FinancialDataLoading loadingStates={loading} />
          ) : (
            <ChatPanel 
              currentReports={{
                profitLoss: reports['profitLoss'],
                balanceSheet: reports['balanceSheet'],
                cashFlow: reports['cashFlow']
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // DESKTOP: Show full layout with sidebar and analysis panel
  return (
    <AppLayout>
      <div className="flex h-screen bg-gray-50">
        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Financial Statements Panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Controls */}
            <div className="flex-shrink-0 p-6 bg-white border-b">
              <div className="flex items-center justify-between mb-4">
                <Title>Financial Analysis</Title>
                <div className="flex space-x-4">
                  <Select value={timePeriod} onValueChange={setTimePeriod}>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="12months">Last 12 Months</SelectItem>
                  </Select>
                </div>
              </div>

              {/* Statement Tabs */}
              <TabGroup>
                <TabList>
                  <Tab onClick={() => setActiveStatement('profitLoss')}>Profit & Loss</Tab>
                  <Tab onClick={() => setActiveStatement('balanceSheet')}>Balance Sheet</Tab>
                  <Tab onClick={() => setActiveStatement('cashFlow')}>Cash Flow</Tab>
                </TabList>
                <TabPanels className="mt-4 h-full min-h-0">
                  <TabPanel className="h-full min-h-0">
                    <div className="h-full min-h-0 border border-gray-200 rounded-lg shadow bg-white overflow-auto">
                      {loading['profitLoss'] ? (
                        <LoadingState type="general" className="p-8" />
                      ) : error['profitLoss'] ? (
                        <div className="p-4">
                          <Text className="text-red-600">{error['profitLoss']}</Text>
                        </div>
                      ) : reports['profitLoss'] ? (
                        <div className="h-full min-h-0 overflow-auto">
                          <PnlTable report={reports['profitLoss']} />
                        </div>
                      ) : (
                        <div className="p-4">
                          <Text>No data available</Text>
                        </div>
                      )}
                    </div>
                  </TabPanel>
                  <TabPanel className="h-full min-h-0">
                    <div className="h-full min-h-0 border border-gray-200 rounded-lg shadow bg-white overflow-auto">
                      {loading['balanceSheet'] ? (
                        <LoadingState type="general" className="p-8" />
                      ) : error['balanceSheet'] ? (
                        <div className="p-4">
                          <Text className="text-red-600">{error['balanceSheet']}</Text>
                        </div>
                      ) : reports['balanceSheet'] ? (
                        <div className="h-full min-h-0 overflow-auto">
                          <PnlTable report={reports['balanceSheet']} />
                        </div>
                      ) : (
                        <div className="p-4">
                          <Text>No data available</Text>
                        </div>
                      )}
                    </div>
                  </TabPanel>
                  <TabPanel className="h-full min-h-0">
                    <div className="h-full min-h-0 border border-gray-200 rounded-lg shadow bg-white overflow-auto">
                      {loading['cashFlow'] ? (
                        <LoadingState type="general" className="p-8" />
                      ) : error['cashFlow'] ? (
                        <div className="p-4">
                          <Text className="text-red-600">{error['cashFlow']}</Text>
                        </div>
                      ) : reports['cashFlow'] ? (
                        <div className="h-full min-h-0 overflow-auto">
                          <PnlTable report={reports['cashFlow']} />
                        </div>
                      ) : (
                        <div className="p-4">
                          <Text>No data available</Text>
                        </div>
                      )}
                    </div>
                  </TabPanel>
                </TabPanels>
              </TabGroup>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Content will be displayed above in TabPanels */}
            </div>
          </div>

          {/* AI Chat Panel */}
          <div className={`bg-white border-l transition-all duration-300 ${
            aiPanelMinimized ? 'w-16' : 'w-96'
          }`}>
            {aiPanelMinimized ? (
              <div className="p-4">
                <Button
                  variant="light"
                  onClick={() => setAiPanelMinimized(false)}
                  className="w-full"
                >
                  Expand AI
                </Button>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-shrink-0 p-4 border-b flex items-center justify-between">
                  <Title>AI Assistant</Title>
                  <Button
                    variant="light"
                    onClick={() => setAiPanelMinimized(true)}
                    size="xs"
                  >
                    Minimize
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ChatPanel 
                    currentReports={{
                      profitLoss: reports['profitLoss'],
                      balanceSheet: reports['balanceSheet'],
                      cashFlow: reports['cashFlow']
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<LoadingState type="general" className="p-8" />}>
      <AnalysisContent />
    </Suspense>
  );
}