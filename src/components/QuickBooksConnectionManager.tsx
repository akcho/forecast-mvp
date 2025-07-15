'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Title, Text } from '@tremor/react';
import { quickBooksStore } from '@/lib/quickbooks/store';

export function QuickBooksConnectionManager() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const connected = await quickBooksStore.isAuthenticatedWithQuickBooks();
      setIsConnected(connected);
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/quickbooks/auth';
  };

  const handleClearTokens = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/quickbooks/clear-all-tokens', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('All tokens cleared successfully. Please reconnect to QuickBooks.');
        setIsConnected(false);
        
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

  // If connected, show connected state
  if (isConnected) {
    return (
      <Card className="max-w-md mx-auto">
        <Title>QuickBooks Connected ✅</Title>
        <Text className="mt-2">
          You are connected to QuickBooks and can access your financial data.
        </Text>
        <div className="mt-4 space-y-3">
          <Button 
            onClick={() => window.location.href = '/analysis'} 
            className="w-full"
          >
            View Financial Analysis
          </Button>
          <Button 
            onClick={handleClearTokens} 
            loading={loading}
            variant="secondary"
            className="w-full"
          >
            Disconnect QuickBooks
          </Button>
          {message && (
            <Text className="mt-2 text-green-600">{message}</Text>
          )}
        </div>
      </Card>
    );
  }

  // If not connected, show connect button
  return (
    <Card className="max-w-md mx-auto">
      <Title>Connect to QuickBooks</Title>
      <Text className="mt-2">
        Connect your QuickBooks account to access your financial data and analysis.
      </Text>
      <div className="mt-4 space-y-3">
        <Button 
          onClick={handleConnect} 
          className="w-full"
        >
          Connect QuickBooks
        </Button>
        <Button 
          onClick={handleClearTokens} 
          loading={loading}
          variant="secondary"
          className="w-full"
        >
          Clear All Tokens
        </Button>
        {message && (
          <Text className="mt-2 text-green-600">{message}</Text>
        )}
      </div>
    </Card>
  );
} 