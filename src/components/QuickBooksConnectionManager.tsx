'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Title, Text, Badge } from '@tremor/react';
import { quickBooksStore } from '@/lib/quickbooks/store';

interface SharedConnectionInfo {
  hasSharedConnection: boolean;
  message: string;
  sharedBy?: string;
  sharedAt?: string;
}

export function QuickBooksConnectionManager() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sharedConnection, setSharedConnection] = useState<SharedConnectionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
    checkSharedConnection();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      // Only set isAdmin if the user has their own tokens (not just a shared connection)
      const connected = await quickBooksStore.isAuthenticatedWithQuickBooks();
      setIsConnected(connected);
      setIsAdmin(connected); // Only true if user has their own tokens
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const checkSharedConnection = async () => {
    try {
      const response = await fetch('/api/quickbooks/share-connection');
      const data = await response.json();
      setSharedConnection(data);
      
      // Test if the shared connection is working
      if (data.hasSharedConnection) {
        try {
          const testResponse = await fetch('/api/quickbooks/company');
          if (!testResponse.ok) {
            setConnectionError('Shared connection has expired. Admin needs to reconnect.');
          }
        } catch (error) {
          setConnectionError('Shared connection has expired. Admin needs to reconnect.');
        }
      }
    } catch (error) {
      console.error('Error checking shared connection:', error);
    }
  };

  const handleForceRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quickbooks/force-refresh', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('Connection cleared. Please reconnect as admin and re-share.');
        setConnectionError(null);
        setIsAdmin(false);
        setIsConnected(false);
        await checkSharedConnection();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error forcing refresh:', error);
      setMessage('Failed to force refresh connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminConnect = () => {
    window.location.href = '/api/quickbooks/auth';
  };

  const handleShareConnection = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // Get current tokens from the store
      const accessToken = quickBooksStore.getAccessToken();
      const refreshToken = quickBooksStore.getRefreshToken();
      const realmId = quickBooksStore.getRealmId();
      
      if (!accessToken || !refreshToken || !realmId) {
        setMessage('No active QuickBooks connection found. Please connect as admin first.');
        return;
      }
      
      const response = await fetch('/api/quickbooks/share-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'share',
          userId: 'admin',
          accessToken,
          refreshToken,
          realmId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Connection shared successfully! Your team can now access QuickBooks data.');
        await checkSharedConnection();
        
        // Redirect to analysis page after a short delay to show the success message
        setTimeout(() => {
          window.location.href = '/analysis';
        }, 1500);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sharing connection:', error);
      setMessage('Failed to share connection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllTokens = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/quickbooks/clear-all-tokens', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('All tokens cleared successfully. Please reconnect to QuickBooks.');
        setConnectionError(null);
        setIsAdmin(false);
        setIsConnected(false);
        await checkSharedConnection();
        
        // Refresh the page to reset all state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
      setMessage('Failed to clear tokens. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Admin UI: Only show if user has their own tokens
  if (isAdmin) {
    return (
      <Card className="max-w-md mx-auto">
        <Title>QuickBooks Connected ✅</Title>
        <Text className="mt-2">
          You are connected as admin.
        </Text>
        <div className="mt-4 space-y-3">
          <Button 
            onClick={handleShareConnection} 
            loading={loading}
            className="w-full"
          >
            Share Connection with Team
          </Button>
          <Button 
            onClick={handleClearAllTokens} 
            loading={loading}
            variant="secondary"
            className="w-full"
          >
            Clear All Tokens
          </Button>
          {message && (
            <Text className="mt-2 text-green-600">{message}</Text>
          )}
          {connectionError && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <Text className="text-sm text-red-700">
                {connectionError}
              </Text>
              <Button 
                onClick={handleForceRefresh} 
                loading={loading}
                className="mt-2 w-full"
              >
                Force Refresh Connection
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // If not admin, always show the connect as admin button, even if a shared connection exists
  return (
    <Card className="max-w-md mx-auto">
      <Title>Connect to QuickBooks</Title>
      <Text className="mt-2">
        {sharedConnection?.hasSharedConnection
          ? 'You are using a shared QuickBooks connection. If you are an admin, you can connect your own account below.'
          : 'Connect your QuickBooks account to share with the team.'}
      </Text>
      <div className="mt-4 space-y-3">
        <Button 
          onClick={handleAdminConnect} 
          className="w-full"
        >
          Connect as Admin
        </Button>
        <Button 
          onClick={handleClearAllTokens} 
          loading={loading}
          variant="secondary"
          className="w-full"
        >
          Clear All Tokens
        </Button>
      </div>
      {sharedConnection?.hasSharedConnection && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <Text className="text-sm text-green-700">
            ✅ You can now access all QuickBooks data using the shared connection.
          </Text>
        </div>
      )}
      {connectionError && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <Text className="text-sm text-red-700">
            {connectionError}
          </Text>
          <Button 
            onClick={handleForceRefresh} 
            loading={loading}
            className="mt-2 w-full"
          >
            Force Refresh Connection
          </Button>
        </div>
      )}
    </Card>
  );
} 