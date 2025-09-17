'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QuickBooksClient } from '@/lib/quickbooks/client';
import { databaseClient } from '@/lib/quickbooks/databaseClient';
import { Text } from '@tremor/react';
import { LoadingState } from '@/components/LoadingSpinner';

function DashboardContent() {
  const searchParams = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'team-member'>('disconnected');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check for connection from OAuth callback
    const quickbooks = searchParams.get('quickbooks');
    const connectionId = searchParams.get('connection_id');
    const error = searchParams.get('error');

    if (error) {
      setError(error);
      return;
    }

    if (quickbooks === 'connected' && connectionId) {
      console.log('New connection established, checking connection status...');
      checkConnectionStatus();
    } else {
      // Check for existing connections in database
      checkConnectionStatus();
    }
  }, [searchParams]);

  const checkConnectionStatus = async () => {
    try {
      const connectionStatus = await databaseClient.getConnectionStatus();

      if (connectionStatus.isAuthenticated && connectionStatus.hasConnection) {
        setConnectionStatus('connected');
        setIsAdmin(true);
        handleTestConnection();
      } else if (connectionStatus.isAuthenticated) {
        // User is authenticated but no connection - team member
        setConnectionStatus('team-member');
        setIsAdmin(false);
      } else {
        // Not authenticated
        setConnectionStatus('disconnected');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnectionStatus('disconnected');
      setIsAdmin(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use API route that handles authentication internally
      const response = await fetch('/api/quickbooks/company-info');
      if (!response.ok) {
        throw new Error('Failed to fetch company info');
      }
      const info = await response.json();
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
      // Use API route that handles authentication internally
      const response = await fetch('/api/quickbooks/balance-sheet');
      if (!response.ok) {
        throw new Error('Failed to fetch balance sheet');
      }
      const report = await response.json();
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
        
        {isAdmin ? (
          // Admin flow
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
        ) : (
          // Team member flow
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Team Member - Using Shared Connection</span>
            <button
              onClick={handleTestConnection}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? 'Testing...' : 'Test Shared Connection'}
            </button>
          </div>
        )}
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

      {(connectionStatus === 'connected' || connectionStatus === 'team-member') && (
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
          <LoadingState type="general" />
        </div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
} 