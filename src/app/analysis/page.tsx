'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense, useRef } from 'react';
import { Title, Text, Select, SelectItem, Button, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { useSearchParams } from 'next/navigation';
import { PnlTable } from '.';
import { QuickBooksLogin } from '@/components/QuickBooksLogin';
import { getValidConnection, getAvailableConnections } from '@/lib/quickbooks/connectionManager';
import { migrateTempConnectionsToRealUser } from '@/lib/quickbooks/connectionManager';
import { LoadingState, FinancialDataLoading } from '@/components/LoadingSpinner';
import { AppLayout } from '@/components/AppLayout';

// ... (interfaces for PnLRow, etc. if needed)

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
  const [activeStatement, setActiveStatement] = useState('profitLoss');
  const [timePeriod, setTimePeriod] = useState('3months');
  const [aiPanelMinimized, setAiPanelMinimized] = useState(false);
  const [reports, setReports] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<{ [key: string]: string | null }>({});
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const isMobile = useIsMobile();
  const migrationAttempted = useRef(false);

  useEffect(() => {
    // Check connection status on client side only
    const status = searchParams.get('quickbooks');
    const connectionId = searchParams.get('connection_id');
    const realmId = searchParams.get('realm_id');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    console.log('Analysis page URL params:', { status, connectionId, realmId, hasAccessToken: !!accessToken });

    const checkConnection = async () => {
      // Check if user explicitly logged out
      const isLoggedOut = localStorage.getItem('qb_logged_out') === 'true';
      if (isLoggedOut) {
        console.log('User is logged out');
        setConnectionChecked(true);
        return;
      }

      // Check if already connected via stored tokens
      if (quickBooksStore.getAccessToken()) {
        console.log('Already connected to QuickBooks');
        setIsConnected(true);
      } else if (status === 'connected' && connectionId) {
        console.log('Successfully connected to QuickBooks with connection ID:', connectionId);
        setIsConnected(true);
      } else if (status === 'connected' && accessToken && refreshToken) {
        console.log('Successfully connected to QuickBooks with tokens (legacy)...');
        quickBooksStore.setTokens(accessToken, refreshToken);
        if (realmId) {
          quickBooksStore.setRealmId(realmId);
        }
        setIsConnected(true);
      } else {
        // Check for database connections (including shared connections)
        try {
          const connections = await getAvailableConnections();
          if (connections.availableConnections.length > 0) {
            console.log('Found existing connections');
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Error checking connections:', error);
        }
      }
      setConnectionChecked(true);
    };

    checkConnection();
  }, [searchParams]);

  useEffect(() => {
    // Copy qb_temp_user_id from cookie to localStorage if present
    if (typeof window !== 'undefined') {
      const cookieMatch = document.cookie.match(/qb_temp_user_id=([^;]+)/);
      if (cookieMatch && !localStorage.getItem('qb_temp_user_id')) {
        localStorage.setItem('qb_temp_user_id', cookieMatch[1]);
      }
    }
  }, []);

  useEffect(() => {
    // Migrate temp user connections to real user ID after redirect
    if (typeof window !== 'undefined' && !migrationAttempted.current) {
      const tempUserId = localStorage.getItem('qb_temp_user_id');
      const realUserId = localStorage.getItem('qb_user_id');
      if (tempUserId && realUserId && tempUserId !== realUserId) {
        migrationAttempted.current = true;
        migrateTempConnectionsToRealUser(tempUserId, realUserId)
          .then(() => {
            console.log('Migrated temp user connections to real user ID');
            localStorage.removeItem('qb_temp_user_id');
            
            // Remove connection_id from URL to use available connections
            const url = new URL(window.location.href);
            url.searchParams.delete('connection_id');
            window.history.replaceState({}, '', url.toString());
          })
          .catch((err) => {
            console.error('Error migrating temp user connections:', err);
          });
      }
    }
  }, [searchParams]);


  useEffect(() => {
    if (!isConnected) return;

    const fetchAllReports = async () => {
      setLoading({ profitLoss: true, balanceSheet: true, cashFlow: true });
      setError({ profitLoss: null, balanceSheet: null, cashFlow: null });
      try {
        let client: QuickBooksClient;
        
        // Always use database connection instead of old store
        console.log('Using database connection for financial data');
        const connection = await getValidConnection(); // No connectionId means use first available
        client = new QuickBooksClient();
        quickBooksStore.setTokens(connection.access_token, connection.refresh_token);
        client.setRealmId(connection.realm_id);
        // Connection is already validated by getValidConnection(), no need to check again
        console.log('Using validated connection:', connection.id);
        
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
        console.error('Error fetching financial data:', e);
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
  }, [timePeriod, isConnected, searchParams]);

  useEffect(() => {
    console.log('State changed - isConnected:', isConnected, 'activeStatement:', activeStatement);
  }, [isConnected, activeStatement]);

  // Show loading state while checking connection
  if (!connectionChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <LoadingState type="general" />
      </div>
    );
  }

  if (!isConnected) {
    console.log('Not connected, showing login screen. isConnected:', isConnected);
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
              timePeriod={timePeriod}
            />
          )}
        </div>
      </div>
    );
  }

  // DESKTOP: Show full analysis view with sidebar
  return (
    <AppLayout>
      <div className="full-viewport flex flex-col">
        <div className="p-8 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold">Financial Analysis</h1>
              <Text className="text-gray-600">
                Review your financial statements
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
          <div className="h-full flex flex-col min-h-0">
            <div className="h-full flex flex-col min-h-0">
            <TabGroup className="flex-1 flex flex-col min-h-0">
              <TabList className="border-b-0 flex-shrink-0 mb-4">
                <Tab onClick={() => setActiveStatement('profitLoss')}>P&L Statement</Tab>
                <Tab onClick={() => setActiveStatement('balanceSheet')}>Balance Sheet</Tab>
                <Tab onClick={() => setActiveStatement('cashFlow')}>Cash Flow</Tab>
              </TabList>
              <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="col-span-2 h-full min-h-0">
                  <TabPanels className="h-full min-h-0 [&_.tremor-TabPanel-root]:mt-0">
                    <TabPanel className="h-full min-h-0">
                      <div className="h-full min-h-0 border border-gray-200 rounded-lg shadow bg-white overflow-y-auto">
                        {loading['profitLoss'] ? (
                          <LoadingState type="profitLoss" />
                        ) : error['profitLoss'] ? (
                          <Text color="red">{error['profitLoss']}</Text>
                        ) : reports['profitLoss'] ? (
                          <div className="h-full min-h-0 overflow-y-auto">
                            <PnlTable report={reports['profitLoss']} />
                          </div>
                        ) : (
                          <Text>No report data found.</Text>
                        )}
                      </div>
                    </TabPanel>
                    <TabPanel className="h-full min-h-0">
                      <div className="h-full min-h-0 border border-gray-200 rounded-lg shadow bg-white overflow-y-auto">
                        {loading['balanceSheet'] ? (
                          <LoadingState type="balanceSheet" />
                        ) : error['balanceSheet'] ? (
                          <Text color="red">{error['balanceSheet']}</Text>
                        ) : reports['balanceSheet'] ? (
                          <div className="h-full min-h-0 overflow-y-auto">
                            <PnlTable report={reports['balanceSheet']} />
                          </div>
                        ) : (
                          <Text>No report data found.</Text>
                        )}
                      </div>
                    </TabPanel>
                    <TabPanel className="h-full min-h-0">
                      <div className="h-full min-h-0 border border-gray-200 rounded-lg shadow bg-white overflow-y-auto">
                        {loading['cashFlow'] ? (
                          <LoadingState type="cashFlow" />
                        ) : error['cashFlow'] ? (
                          <Text color="red">{error['cashFlow']}</Text>
                        ) : reports['cashFlow'] ? (
                          <div className="h-full min-h-0 overflow-y-auto">
                            <PnlTable report={reports['cashFlow']} />
                          </div>
                        ) : (
                          <Text>No report data found.</Text>
                        )}
                      </div>
                    </TabPanel>
                  </TabPanels>
                </div>
                {!aiPanelMinimized && (
                  <div className="col-span-1 h-full min-h-0 border border-gray-200 rounded-lg shadow bg-white overflow-y-auto">
                    <div className="h-full min-h-0 flex flex-col">
                      <Title className="flex-shrink-0 p-4">AI Financial Analysis</Title>
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        <Suspense fallback={<LoadingState type="ai" className="p-4" />}>
                          <ChatPanel 
                            currentReports={{
                              profitLoss: reports['profitLoss'],
                              balanceSheet: reports['balanceSheet'],
                              cashFlow: reports['cashFlow']
                            }}
                            timePeriod={timePeriod}
                          />
                        </Suspense>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabGroup>
          </div>
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
