'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { Text } from '@tremor/react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for tokens in URL parameters (from callback)
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const realmId = searchParams.get('realm_id');
    const error = searchParams.get('error');

    if (error) {
      setError(error);
      return;
    }

    if (accessToken && refreshToken) {
      console.log('Storing tokens from URL parameters');
      quickBooksStore.setTokens(accessToken, refreshToken);
      if (realmId) {
        quickBooksStore.setRealmId(realmId);
      }
      setConnectionStatus('connected');
      handleTestConnection();
    } else {
      // Check for existing tokens in store
      const storedAccessToken = quickBooksStore.getAccessToken();
      const storedRefreshToken = quickBooksStore.getRefreshToken();
      const storedRealmId = quickBooksStore.getRealmId();

      if (storedAccessToken && storedRefreshToken && storedRealmId) {
        setConnectionStatus('connected');
        handleTestConnection();
      }
    }
  }, [searchParams]);

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = new QuickBooksClient();
      const info = await client.getCompanyInfo();
      setCompanyInfo(info);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error testing connection:', error);
      setError(error instanceof Error ? error.message : 'Failed to test connection');
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchBalanceSheet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = new QuickBooksClient();
      const report = await client.getBalanceSheet();
      setBalanceSheet(report);
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch balance sheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    const client = new QuickBooksClient();
    window.location.href = client.getAuthorizationUrl();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">QuickBooks Connection</h2>
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
          {connectionStatus === 'disconnected' && (
            <button
              onClick={handleConnect}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Connect to QuickBooks
            </button>
          )}
          {connectionStatus === 'connected' && (
            <button
              onClick={handleTestConnection}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              disabled={isLoading}
            >
              {isLoading ? 'Testing...' : 'Test Connection'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {companyInfo && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Company Information</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(companyInfo, null, 2)}
          </pre>
        </div>
      )}

      {connectionStatus === 'connected' && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Balance Sheet</h2>
          <button
            onClick={handleFetchBalanceSheet}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Fetch Balance Sheet'}
          </button>
          {balanceSheet && (
            <pre className="mt-4 bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(balanceSheet, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <Text>Loading...</Text>
        </div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
} 