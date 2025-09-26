'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { Text, Select, SelectItem, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { PnlTable } from '../analysis';
import { QuickBooksLogin } from '@/components/QuickBooksLogin';
import { useSession } from 'next-auth/react';
import { LoadingState, FinancialDataLoading } from '@/components/LoadingSpinner';
import { usePageHeader } from '@/components/PageHeaderContext';
import { useCompany } from '@/lib/context/CompanyContext';

const ChatPanel = dynamic(() => import('@/components/ChatPanel'), {
  ssr: false,
  loading: () => <LoadingState type="ai" className="p-4" />,
});

// Add a utility to detect mobile
function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

function ReportsContent() {
  const { selectedCompanyId } = useCompany();
  const [timePeriod, setTimePeriod] = useState('3months');
  const [activeStatement, setActiveStatement] = useState<'profitLoss' | 'balanceSheet' | 'cashFlow'>('profitLoss');
  const { setHeaderConfig } = usePageHeader();
  const [reports, setReports] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<{ [key: string]: string | null }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const isMobile = useIsMobile();
  const { data: session } = useSession();

  // Set page header configuration
  useEffect(() => {
    setHeaderConfig({
      title: 'Financial Reports',
      icon: '📊',
      description: 'View and analyze your financial statements',
      controls: (
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectItem value="3months">Last 3 Months</SelectItem>
          <SelectItem value="6months">Last 6 Months</SelectItem>
          <SelectItem value="12months">Last 12 Months</SelectItem>
        </Select>
      )
    });

    // Cleanup function to clear header on unmount
    return () => setHeaderConfig(null);
  }, [setHeaderConfig, timePeriod]);

  // Check connection status when user is authenticated and company is selected
  useEffect(() => {
    if (session?.user?.dbId && selectedCompanyId) {
      checkConnectionStatus();
    } else if (session === null) {
      // Session loaded but user not authenticated
      setConnectionChecked(true);
    }
  }, [session, selectedCompanyId]);

  const checkConnectionStatus = async () => {
    if (!session?.user?.dbId || !selectedCompanyId) return;

    try {
      const response = await fetch(`/api/quickbooks/status?company_id=${selectedCompanyId}`);
      const connectionStatus = await response.json();
      
      if (connectionStatus.hasConnection && connectionStatus.companyConnection) {
        setIsConnected(true);
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
    if (!isConnected || !selectedCompanyId) return;

    const fetchAllReports = async () => {
      setLoading({ profitLoss: true, balanceSheet: true, cashFlow: true });
      setError({ profitLoss: null, balanceSheet: null, cashFlow: null });

      // Check that we have required session and company data
      if (!session?.user?.dbId || !selectedCompanyId) {
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
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - months + 1, 1);
        const startDateStr = startDate.toISOString().split('T')[0];

        console.log('Fetching financial reports:', { startDateStr, endDateStr });

        // Use API routes that handle authentication internally with monthly breakdown
        const [profitLossData, balanceSheetData, cashFlowData] = await Promise.allSettled([
          fetch(`/api/quickbooks/profit-loss?start_date=${startDateStr}&end_date=${endDateStr}&summarize_column_by=Month&company_id=${selectedCompanyId}`).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return res.json();
          }),
          fetch(`/api/quickbooks/balance-sheet?start_date=${startDateStr}&end_date=${endDateStr}&summarize_column_by=Month&company_id=${selectedCompanyId}`).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return res.json();
          }),
          fetch(`/api/quickbooks/cash-flow?start_date=${startDateStr}&end_date=${endDateStr}&summarize_column_by=Month&company_id=${selectedCompanyId}`).then(res => {
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
  }, [isConnected, selectedCompanyId, timePeriod, session]);

  console.log('Reports page state:', { isConnected, connectionChecked, selectedCompanyId });

  if (!connectionChecked) {
    return <LoadingState type="general" className="p-8" />;
  }

  if (!session?.user) {
    return <QuickBooksLogin onConnectionChange={() => setIsConnected(true)} />;
  }

  if (!isConnected) {
    return <QuickBooksLogin onConnectionChange={() => setIsConnected(true)} />;
  }

  console.log('Connected, showing reports view. isConnected:', isConnected);

  // MOBILE: Show only the chat panel, full screen (without sidebar)
  if (isMobile) {
    const reportsLoaded = reports['profitLoss'] && reports['balanceSheet'] && reports['cashFlow'];
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 text-lg font-bold text-gray-900 dark:text-gray-100">AI Assistant</div>
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
              companyId={selectedCompanyId || undefined}
            />
          )}
        </div>
      </div>
    );
  }

  // DESKTOP: Show layout with natural height (no forced full screen)
  return (
      <div className="flex h-full bg-gray-50 dark:bg-gray-900 overflow-auto">
        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Financial Statements Panel */}
          <div className="flex-1 flex flex-col min-w-0 flex-shrink-0" style={{ minWidth: 0, width: 0, flexGrow: 1 }}>

            {/* Statement Tabs */}
            <div className="p-6">
              <TabGroup>
                <TabList className="flex-shrink-0">
                  <Tab onClick={() => setActiveStatement('profitLoss')}>Profit & Loss</Tab>
                  <Tab onClick={() => setActiveStatement('balanceSheet')}>Balance Sheet</Tab>
                  <Tab onClick={() => setActiveStatement('cashFlow')}>Cash Flow</Tab>
                </TabList>
                <TabPanels className="mt-4">
                  <TabPanel>
                    {loading['profitLoss'] ? (
                      <div className="h-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        <LoadingState type="general" className="p-8" />
                      </div>
                    ) : error['profitLoss'] ? (
                      <div className="h-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        <Text className="text-red-600 dark:text-red-400">{error['profitLoss']}</Text>
                      </div>
                    ) : reports['profitLoss'] ? (
                      <PnlTable report={reports['profitLoss']} />
                    ) : (
                      <div className="h-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        <Text className="text-gray-600 dark:text-gray-400">No data available</Text>
                      </div>
                    )}
                  </TabPanel>
                  <TabPanel>
                    {loading['balanceSheet'] ? (
                      <div className="h-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        <LoadingState type="general" className="p-8" />
                      </div>
                    ) : error['balanceSheet'] ? (
                      <div className="h-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        <Text className="text-red-600 dark:text-red-400">{error['balanceSheet']}</Text>
                      </div>
                    ) : reports['balanceSheet'] ? (
                      <PnlTable report={reports['balanceSheet']} />
                    ) : (
                      <div className="h-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        <Text className="text-gray-600 dark:text-gray-400">No data available</Text>
                      </div>
                    )}
                  </TabPanel>
                  <TabPanel>
                    {loading['cashFlow'] ? (
                      <div className="h-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        <LoadingState type="general" className="p-8" />
                      </div>
                    ) : error['cashFlow'] ? (
                      <div className="h-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        <Text className="text-red-600 dark:text-red-400">{error['cashFlow']}</Text>
                      </div>
                    ) : reports['cashFlow'] ? (
                      <PnlTable report={reports['cashFlow']} />
                    ) : (
                      <div className="h-96 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        <Text className="text-gray-600 dark:text-gray-400">No data available</Text>
                      </div>
                    )}
                  </TabPanel>
                </TabPanels>
              </TabGroup>
            </div>

          </div>
        </div>
      </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingState type="general" className="p-8" />}>
      <ReportsContent />
    </Suspense>
  );
}