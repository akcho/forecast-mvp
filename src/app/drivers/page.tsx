'use client';

import { useState, useEffect } from 'react';
import { QuickBooksLogin } from '@/components/QuickBooksLogin';
import { quickBooksStore } from '@/lib/quickbooks/store';
import { useSession } from 'next-auth/react';
import { LoadingState } from '@/components/LoadingSpinner';
import { DriverDiscoveryUI } from '@/components/DriverDiscoveryUI';
import { usePageHeader } from '@/components/PageHeaderContext';

export default function DriversPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const { data: session } = useSession();
  const { setHeaderConfig } = usePageHeader();

  // Set page header configuration
  useEffect(() => {
    setHeaderConfig({
      title: 'Business Drivers',
      icon: '🎯',
      description: 'Discover and analyze your key business drivers'
    });

    // Cleanup function to clear header on unmount
    return () => setHeaderConfig(null);
  }, [setHeaderConfig]);

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <LoadingState type="general" />
      </div>
    );
  }

  // Show login screen if not authenticated or not connected
  if (!session?.user || !isConnected) {
    console.log('Not connected, showing login screen');
    return <QuickBooksLogin onConnectionChange={() => setIsConnected(true)} />;
  }

  // Show drivers page content when connected
  return (
      <div className="h-screen overflow-auto">
        <DriverDiscoveryUI />
      </div>
  );
}