'use client';

import { useState, useEffect } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { AppLayout } from '@/components/AppLayout';
import { QuickBooksLogin } from '@/components/QuickBooksLogin';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { useSession } from 'next-auth/react';
import { LoadingState } from '@/components/LoadingSpinner';

export default function OverviewPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    // Check connection status on client side
    const checkConnection = async () => {
      if (!session?.user?.dbId) {
        setConnectionChecked(true);
        return;
      }

      try {
        const response = await fetch('/api/quickbooks/status');
        const connectionStatus = await response.json();
        if (connectionStatus.hasConnection && connectionStatus.companyConnection) {
          console.log('Found company connection');
          setIsConnected(true);
        } else {
          console.log('No company connection found');
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error checking connections:', error);
        setIsConnected(false);
      }
      
      setConnectionChecked(true);
    };

    if (session?.user?.dbId) {
      checkConnection();
    } else if (session === null) {
      // Session loaded but user not authenticated
      setConnectionChecked(true);
    }
  }, [session]);

  // Show loading state while checking connection
  if (!connectionChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <LoadingState type="general" />
      </div>
    );
  }

  // Show login screen if not authenticated or not connected
  if (!session?.user || !isConnected) {
    console.log('Not connected, showing login screen');
    return <QuickBooksLogin onConnectionChange={() => setIsConnected(true)} />;
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