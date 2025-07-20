'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { AppLayout } from '@/components/AppLayout';
import { QuickBooksConnectionManager } from '@/components/QuickBooksConnectionManager';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { getAvailableConnections } from '@/lib/quickbooks/connectionManager';
import { LoadingState } from '@/components/LoadingSpinner';

export default function OverviewPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);

  useEffect(() => {
    // Check connection status on client side
    const checkConnection = async () => {
      // Check if already connected via stored tokens
      if (quickBooksStore.getAccessToken()) {
        console.log('Already connected to QuickBooks');
        setIsConnected(true);
      } else {
        // Check for database connections
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
  }, []);

  // Show loading state while checking connection
  if (!connectionChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <LoadingState type="general" />
      </div>
    );
  }

  // Show connection manager if not connected
  if (!isConnected) {
    console.log('Not connected, showing connection manager');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <QuickBooksConnectionManager />
      </div>
    );
  }

  // Show overview page content when connected
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <Title className="text-2xl font-bold text-gray-900">Overview</Title>
          <Text className="text-gray-600 mt-1">
            Dashboard overview and key metrics
          </Text>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-gray-400 text-lg mb-2">🚧</div>
                <Title className="text-gray-600">Coming Soon</Title>
                <Text className="text-gray-500">
                  The overview page is under construction
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}