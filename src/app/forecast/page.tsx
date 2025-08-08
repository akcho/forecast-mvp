'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { QuickBooksLogin } from '@/components/QuickBooksLogin';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { getAvailableConnections } from '@/lib/quickbooks/connectionManager';
import { LoadingState } from '@/components/LoadingSpinner';
import { ForecastContent } from '@/components/ForecastContent';

export default function ForecastPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);

  useEffect(() => {
    // Check connection status on client side
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

  // Show login screen if not connected
  if (!isConnected) {
    console.log('Not connected, showing login screen');
    return <QuickBooksLogin onConnectionChange={() => setIsConnected(true)} />;
  }

  // Show forecast page content when connected
  return (
    <AppLayout>
      <ForecastContent />
    </AppLayout>
  );
}